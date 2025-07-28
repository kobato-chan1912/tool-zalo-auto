import { getPendingMessagesForIMEI, findAliasByPhone, findAliasByUid, insertAlias, callReturnStatusSendMessage, callReplyZaloMessages } from './db.js';
import path from 'path';
import { ThreadType } from 'zca-js';


const isNaturalNumber = (str) => {
    const num = Number(str);
    return Number.isInteger(num) && num >= 0;
};

export async function processPendingMessages(instances) {


    for (const instance of instances) {
        const { api, accountData } = instance;
        const messages = await getPendingMessagesForIMEI(accountData.imei);


        for (const msg of messages) {
            const { id, zalo_receiver, content, attachment_path, send_type } = msg;

            const api = instance.api;

            try {
                let globalSendID = null;
                let globalSendName = null;
                if (send_type === 'user') {
                    // Tìm alias
                    let alias = await findAliasByPhone(zalo_receiver);


                    if (!alias) {
                        // Gọi Zalo API tìm user
                        const result = await api.findUser(zalo_receiver);
                        if (!result || !result.uid) throw new Error('Không tìm thấy người dùng');

                        await insertAlias(zalo_receiver, result.uid, result.zalo_name);
                        alias = { phone: zalo_receiver, uid: result.uid, zaloName: result.zalo_name };
                    }

                    globalSendID = alias.uid;
                    globalSendName = alias.zaloName;



                    // Gửi nội dung


                    if (content) {
                        await api.sendMessage(content, alias.uid, ThreadType.User);

                    }

                    // Gửi file
                    if (attachment_path) {
                        await api.sendMessage(
                            {
                                msg: '',
                                attachments: [path.resolve(attachment_path)],
                            },
                            alias.uid
                        );
                    }
                }

                // ==== Group ====
                else if (send_type === 'group') {
                    let groupUid = null;

                    const isNumberReceiver = isNaturalNumber(zalo_receiver);
                    if (!isNumberReceiver) {
                        const allGroups = await api.getAllGroups();
                        const groupIds = Object.keys(allGroups.gridVerMap);

                        for (const gid of groupIds) {
                            const groupInfo = await api.getGroupInfo(gid);
                            const group = groupInfo.gridInfoMap?.[gid];
                            if (group?.name === zalo_receiver) {
                                groupUid = gid;
                                globalSendID = gid;
                                globalSendName = group.name;
                                break;
                            }
                        }


                        if (!groupUid) throw new Error('Không tìm thấy group phù hợp');

                    } else {
                        groupUid = zalo_receiver;
                        globalSendID = zalo_receiver;
                        const groupInfo = await api.getGroupInfo(groupUid);
                        const group = groupInfo.gridInfoMap?.[groupUid];
                        globalSendName = group.name;

                        if (!globalSendName) throw new Error('Không tìm thấy group phù hợp');
                    }

                    if (content) {
                        await api.sendMessage(content, groupUid, ThreadType.Group);
                    }

                    if (attachment_path) {
                        await api.sendMessage(
                            {
                                msg: '',
                                attachments: [path.resolve(attachment_path)],
                            },
                            groupUid,
                            ThreadType.Group
                        );
                    }
                }

                // ✅ Cập nhật trạng thái đã gửi
                await callReturnStatusSendMessage(msg.id, 'done');
                console.log(`✅ Gửi tin nhắn ID ${id} thành công`);
                let imagePath = null;
                let filePath = null;
                if (attachment_path) {
                    if (attachment_path.endsWith('.jpg') || attachment_path.endsWith('.png')
                        || attachment_path.endsWith('.jpeg') || attachment_path.endsWith('.gif')) {
                        imagePath = path.resolve(attachment_path);
                    } else {
                        filePath = path.resolve(attachment_path);
                    }
                }

                let myInfo = await api.fetchAccountInfo()


                const replyData = ({
                    message_id: "self-sent",
                    sendTo: globalSendName,
                    sendTo_id: globalSendID,
                    sender: myInfo.zalo_name,
                    sender_id: myInfo.uid,
                    zalo_receiver: accountData.name,
                    text: content,
                    image: imagePath,
                    file: filePath
                });

                await callReplyZaloMessages(replyData);
                //

            } catch (err) {
                console.log(err)
                console.error(`❌ Gửi tin nhắn ID ${id} lỗi:`, err.message);
                await callReturnStatusSendMessage(msg.id, 'error', err.message);
            }
        }

    }
}
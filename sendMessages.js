import { getPendingMessagesForIMEI, findAliasByPhone, insertAlias, callReturnStatusSendMessage } from './db.js';
import path from 'path';
import { ThreadType } from 'zca-js';

export async function processPendingMessages(instances) {
    

    for (const instance of instances) {
        const { api, accountData } = instance;
        const messages = await getPendingMessagesForIMEI(accountData.imei);


        for (const msg of messages) {
            const { id, zalo_receiver, content, attachment_path, send_type } = msg;

            const api = instance.api;

            try {
                if (send_type === 'user') {
                    // Tìm alias
                    let alias = await findAliasByPhone(zalo_receiver);
                    

                    if (!alias) {
                        // Gọi Zalo API tìm user
                        const result = await api.findUser(zalo_receiver);
                        if (!result || !result.uid) throw new Error('Không tìm thấy người dùng');

                        await insertAlias(zalo_receiver, result.uid, result.zaloName);
                        alias = { phone: zalo_receiver, uid: result.uid };
                    } 

                    

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
                    const allGroups = await api.getAllGroups();
                    const groupIds = Object.keys(allGroups.gridVerMap);

                    let groupUid = null;

                    for (const gid of groupIds) {
                        const groupInfo = await api.getGroupInfo(gid);
                        const group = groupInfo.gridInfoMap?.[gid];
                        if (group?.name === zalo_receiver) {
                            groupUid = gid;
                            break;
                        }
                    }

                    if (!groupUid) throw new Error('Không tìm thấy group phù hợp');

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

            } catch (err) {
                console.log(err)
                console.error(`❌ Gửi tin nhắn ID ${id} lỗi:`, err.message);
                await callReturnStatusSendMessage(msg.id, 'error', err.message);
            }
        }

    }
}
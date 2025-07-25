const puppeteer = require('puppeteer-core');
const axios = require('axios');


async function getBrowser(gpm_id) {

  const API_BASE_URL = "http://127.0.0.1:19995/api/v3";
  const res = await axios.get(`${API_BASE_URL}/profiles/start/${gpm_id}`);
  if (!res.data.success) throw new Error(`Không thể mở profile ${gpm_id}`);

  const { remote_debugging_address } = res.data.data;
  await new Promise(resolve => setTimeout(resolve, 5000));
  const browser = await puppeteer.connect({
    browserURL: `http://${remote_debugging_address}`,
    defaultViewport: null,
    headless: 'new',
  });

  return browser;
}

module.exports = { getBrowser };

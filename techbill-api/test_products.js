const axios = require('axios');

async function run() {
  try {
    const res = await axios.get('http://localhost:3000/inventory/products');
    console.log('Success:', res.data.length);
  } catch (err) {
    console.error('Error:', err.response?.status, err.response?.data || err.message);
  }
}
run();

// import httpProxy from 'http-proxy';

// const proxy = httpProxy.createProxyServer();

// export default function handler(req, res) {
//   proxy.web(req, res, { target: 'http://localhost:5000/' }, (err) => {
//     if (err) {
//       console.error('Proxy error:', err);
//       res.status(500).json({ error: 'Proxy failed' });
//     }
//   });
// }

// export const config = {
//   api: {
//     bodyParser: false, // Disable body parsing to forward raw requests
//   },
// };
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 4173);
const APP_FILE = path.join(__dirname, 'pesquisa-cclasstrib-ncm.html');
const UPSTREAM = 'https://dfe-portal.svrs.rs.gov.br/CFF/ClassificacaoTributariaNcm';

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

function sendApp(res) {
  fs.readFile(APP_FILE, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Não foi possível abrir o HTML da aplicação. Mantenha server.js e pesquisa-cclasstrib-ncm.html na mesma pasta.');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/pesquisa-cclasstrib-ncm.html')) {
    return sendApp(res);
  }

  if (url.pathname === '/api/search') {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'Use GET para consultar.' });

    const ncm = (url.searchParams.get('ncm') || '').replace(/\D/g, '');
    const dfeTypes = url.searchParams.get('dfeTypes') || 'NFE';
    if (!/^\d{8}$/.test(ncm)) return sendJson(res, 400, { error: 'O NCM precisa ter exatamente 8 dígitos.' });
    if (!['NFE', 'NFCE'].includes(dfeTypes)) return sendJson(res, 400, { error: 'Tipo de DF-e inválido.' });

    const upstreamUrl = new URL(UPSTREAM);
    upstreamUrl.searchParams.set('ncm', ncm);
    upstreamUrl.searchParams.set('dfeTypes', dfeTypes);

    try {
      const upstream = await fetch(upstreamUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
          'User-Agent': 'Mozilla/5.0 (compatible; Pesquisa-cClassTrib/1.0)'
        },
        signal: AbortSignal.timeout(25000)
      });
      if (!upstream.ok) {
        return sendJson(res, 502, { error: `A SVRS respondeu com HTTP ${upstream.status}.` });
      }
      const html = await upstream.text();
      if (!html.trim()) return sendJson(res, 502, { error: 'A SVRS retornou uma resposta vazia.' });
      return sendJson(res, 200, { ncm, dfeTypes, html });
    } catch (err) {
      const message = err && err.name === 'TimeoutError'
        ? 'A consulta à SVRS excedeu o tempo limite de 25 segundos.'
        : `Não foi possível alcançar a SVRS: ${err?.message || 'falha de rede'}`;
      return sendJson(res, 502, { error: message });
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Não encontrado. Abra a aplicação em http://127.0.0.1:' + PORT + '/');
});

server.listen(PORT, HOST, () => {
  console.log(`Pesquisa cClassTrib disponível em http://${HOST}:${PORT}/`);
  console.log('O servidor aceita somente conexões locais neste computador.');
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`A porta ${PORT} já está em uso. Tente outra, por exemplo PORT=4174.`);
  } else {
    console.error('Falha ao iniciar o servidor local:', err.message);
  }
  process.exitCode = 1;
});

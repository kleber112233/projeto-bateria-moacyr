import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// WebXR exige HTTPS (contexto seguro), inclusive na rede local.
// O basicSsl gera um certificado autoassinado automaticamente.
export default defineConfig({
  plugins: [basicSsl()],
  server: {
    host: true, // escuta em 0.0.0.0 -> acessível pelos outros aparelhos da rede
    port: 5173,
    // Túnel para testar no celular (cloudflared/ngrok): sem liberar o host do
    // túnel aqui, o Vite recusa a conexão com "Blocked request".
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app'],
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});

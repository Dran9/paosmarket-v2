import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import tailwindConfig from './tailwind.config.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: [
    tailwindcss({
      ...tailwindConfig,
      content: tailwindConfig.content.map((p) => path.resolve(__dirname, p)),
    }),
    autoprefixer(),
  ],
};

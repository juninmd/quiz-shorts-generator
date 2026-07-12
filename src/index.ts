import 'dotenv/config';
import { AppRunner } from './app.js';

const app = new AppRunner();

app.run()
  .then(status => {
    process.exit(status);
  })
  .catch(err => {
    console.error('💥 CRASH FATAL:', err);
    process.exit(1);
  });

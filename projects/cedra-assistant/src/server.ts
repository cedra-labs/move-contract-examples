import dotenv from "dotenv";
import { createServer } from "./app.ts";

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = createServer();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

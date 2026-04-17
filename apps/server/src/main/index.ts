import { createServer } from "../interfaces/http/server";
import "dotenv/config";

async function bootstrap() {
  const app = createServer();

  const PORT = process.env.PORT || 3333;
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port http://localhost:${PORT}/graphql`);
  });
}

bootstrap();
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "src/app.module";
import { DataSource, getConnection } from "typeorm";

describe("UserModule (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    const dataSource = new DataSource({
      type: "postgres",
      host: "localhost",
      port: 5432,
      username: "admin",
      password: "admin",
      database: "nuber-eats-test",
    });
    const connection = await dataSource.initialize();
    await connection.dropDatabase();
    await connection.destroy();
    app.close();
  });

  it.todo("me");
  it.todo("userProfile");
  it.todo("createAccount");
  it.todo("login");
  it.todo("editProfile");
  it.todo("verifyEmail");
});

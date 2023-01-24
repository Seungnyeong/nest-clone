import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "src/app.module";
import { DataSource, Repository } from "typeorm";
import * as request from "supertest";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "src/users/entities/user.entity";
import { Verification } from "src/users/entities/verification.entity";

jest.mock("got", () => {
  return {
    post: jest.fn(),
  };
});

const GRAPHQL_ENDPOINT = "/graphql";

const testUser = {
  email: "test@gmail.com",
  password: "12345",
};

describe("UserModule (e2e)", () => {
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let verificationsRepository: Repository<Verification>;
  let jwtToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    verificationsRepository = module.get<Repository<Verification>>(
      getRepositoryToken(Verification)
    );
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

  describe("createAccount", () => {
    it("should create account", () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
          mutation {
                createAccount(input:{
                  email : "${testUser.email}",
                  password : "${testUser.password}",
                  role : Owner
                }) {
                  ok
                  error
                }
              }`,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBe(true);
          expect(res.body.data.createAccount.error).toBe(null);
        });
    });

    it("should fail if account already exist", () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
          mutation {
                createAccount(input:{
                  email : "${testUser.email}",
                  password : "${testUser.password}",
                  role : Owner
                }) {
                  ok
                  error
                }
              }`,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBe(false);
          expect(res.body.data.createAccount.error).toEqual(
            "There is a user with that email already"
          );
        });
    });
  });

  describe("login", () => {
    it("should login with correct credentials", () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
            mutation {
                login(input:{
                    email : "${testUser.email}",
                    password : "${testUser.password}",
              }) {
                ok
                error
                token
              }
            }
            `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login.ok).toBe(true);
          expect(login.error).toBe(null);
          expect(login.token).toEqual(expect.any(String));
          jwtToken = login.token;
        });
    });

    it("should not be able to login with wrong credentials", () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
            mutation {
                login(input:{
                    email : "${testUser.email}",
                    password : "1234asdfadsfasf",
              }) {
                ok
                error
                token
              }
            }
            `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login.ok).toBe(false);
          expect(login.error).toBe("Wrong Password");
          expect(login.token).toBe(null);
        });
    });
  });

  describe("userProfile", () => {
    let userId: number;
    beforeAll(async () => {
      const [user] = await usersRepository.find();
      userId = user.id;
    });

    it("should find a user's profile", () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set("x-jwt", jwtToken)
        .send({
          query: `
            {
                userProfile(userId:${userId}) {
                  ok
                  error
                  user {
                    id
                  }
                }
              }
            `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: {
                  ok,
                  error,
                  user: { id },
                },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(id).toBe(userId);
        });
    });

    it("should not find a prfile", () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set("x-jwt", jwtToken)
        .send({
          query: `
            {
                userProfile(userId:66) {
                  ok
                  error
                  user {
                    id
                  }
                }
              }
            `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: { ok, error, user },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe("User Not Found");
          expect(user).toBe(null);
        });
    });
  });

  describe("me", () => {
    it("should find my profile", () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set("X-JWT", jwtToken)
        .send({
          query: `
            {
                me {
                  email
                }
              }
            `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email },
              },
            },
          } = res;
          expect(email).toBe(testUser.email);
        });
    });
    it("should not allow logged out user", () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
            {
                me {
                  email
                }
              }
            `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: { errors },
          } = res;
          const [error] = errors;
          expect(error.message).toBe("Forbidden resource");
        });
    });
  });

  describe("editProfile", () => {
    it("should change email", () => {
      const NEW_EMAIL = "test@gmail.com";
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .set("X-JWT", jwtToken)
        .send({
          query: `
            mutation {
                editProfile(input: {
                  email : "${NEW_EMAIL}"
                }) {
                    ok
                    error
                }
              }
            `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editProfile: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        })
        .then(() => {
          return request(app.getHttpServer())
            .post(GRAPHQL_ENDPOINT)
            .set("X-JWT", jwtToken)
            .send({
              query: `
            {
                me {
                  email
                }
              }
            `,
            })
            .expect(200)
            .expect((res) => {
              const {
                body: {
                  data: {
                    me: { email },
                  },
                },
              } = res;
              expect(email).toBe(NEW_EMAIL);
            });
        });
    });
  });

  describe("verfiyEmail", () => {
    let verificationCode: string;
    beforeAll(async () => {
      const [verfication] = await verificationsRepository.find();
      verificationCode = verfication.code;
    });

    it("should verify email", () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
            mutation {
                verifyEmail(input :{ 
                  code : "${verificationCode}"
              }) {
                ok
                error
              }
            }
            `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res;
          console.log(res);
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it("should fail on verify code not found", () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
            mutation {
                verifyEmail(input :{ 
                  code : "asdfadsfadsf"
              }) {
                ok
                error
              }
            }
            `,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe("Verification not found.");
        });
    });
  });
});

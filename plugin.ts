import {
  FastifyPluginCallback,
  FastifyRequest,
  FastifyReply,
  DoneFuncWithErrOrRes
} from "fastify";
import fp from "fastify-plugin";
import Cookies, {
  CookieChangeOptions,
  CookieSetOptions
} from "universal-cookie";
import cookie from "cookie";

export type setCookieWrapper = (
  name: string,
  value: string,
  options?: CookieSetOptions
) => FastifyReply;

declare module "fastify" {
  interface FastifyRequest {
    universalCookies: Cookies;
    cookie: setCookieWrapper;
    clearCookie(name: string, options?: CookieSetOptions): FastifyReply;
  }
}

const setCookie = (
  fastifyRes: FastifyReply,
  { options, value, name }: CookieChangeOptions
) => {
  const expressOpt = Object.assign({}, options);
  if (expressOpt.maxAge && options && options.maxAge) {
    // the standard for maxAge is seconds but express uses milliseconds
    expressOpt.maxAge = options.maxAge * 1000;
  }

  const serialized = cookie.serialize(name, value, expressOpt);

  let setCookie = fastifyRes.getHeader("Set-Cookie") as string[] | string;

  if (!setCookie) {
    fastifyRes.header("Set-Cookie", serialized);
    return fastifyRes;
  }

  if (typeof setCookie === "string") {
    setCookie = [setCookie];
  }

  setCookie.push(serialized);
  fastifyRes.removeHeader("Set-Cookie");
  fastifyRes.header("Set-Cookie", setCookie);
  return fastifyRes;
};

const universalCookies = (
  fastifyReq: FastifyRequest,
  fastifyRes: FastifyReply,
  next: DoneFuncWithErrOrRes
) => {
  fastifyReq.universalCookies = new Cookies(fastifyReq?.headers?.cookie || "");
  fastifyReq.universalCookies.addChangeListener(
    (change: CookieChangeOptions) => {
      if (change.value === undefined) {
        setCookie(fastifyRes, change); // clearCookie
      } else {
        setCookie(fastifyRes, change);
      }
    }
  );

  next();
};

const plugin: FastifyPluginCallback = (fastify, _options, next: any) => {
  fastify.addHook("preHandler", universalCookies);
  next();
};

export default fp(plugin, {
  name: "@kiyasov/universal-cookie-fastify"
});

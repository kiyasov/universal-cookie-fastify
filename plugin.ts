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

const universalCookies = (
  fastifyReq: FastifyRequest,
  _fastifyRes: FastifyReply,
  next: DoneFuncWithErrOrRes
) => {
  fastifyReq.universalCookies = new Cookies(fastifyReq?.headers?.cookie || "");
  fastifyReq.universalCookies.addChangeListener(
    (change: CookieChangeOptions) => {
      if (!fastifyReq.cookie) {
        return;
      }

      if (change.value === undefined) {
        fastifyReq.clearCookie(change.name, change.options);
      } else {
        const expressOpt = Object.assign({}, change.options);
        if (expressOpt.maxAge && change.options && change.options.maxAge) {
          // the standard for maxAge is seconds but express uses milliseconds
          expressOpt.maxAge = change.options.maxAge * 1000;
        }

        fastifyReq.cookie(change.name, change.value, expressOpt);
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

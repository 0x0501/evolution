// path intercept

import { createMiddleware } from "langchain";

export const ModelPathInterceptorMiddleware = () => {
	return createMiddleware({
		name: "model-path-interceptor-middleware",
		wrapModelCall: (request, handler) => {
			// type ModelRequest = typeof request;

			return handler({
				...request,
				systemMessage: request.systemMessage.concat(
					`You MUST use \`clean_path\` tool to sanitize raw path and get the correct one.`,
				),
			});
			// return path.replace(
			//     /.*workspace/g, // 去掉 workspace 前的所有内容
			//     ""
			// ) || "/artifacts";
		},
	});
};

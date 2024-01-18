import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {OpenAI} from 'openai';
import {config} from 'dotenv';

config();
/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY});
const promptMessages= [{"role": "system", "content": "Known are four names: david smith 大卫 史密斯, yueling zhang 月林张, huawen wu 华文吴, annie lee 李安妮. Each name consists of an English part followed by a Chinese part. Based on the given user input, please return full english name and chinese name if there is an exact match with one of these names."},
{"role": "user", "content": "吴华文"},
{"role": "assistant", "content": "huawen wu 华文吴"},
{"role": "user", "content": "wu huawen"},
{"role": "assistant", "content": "huawen wu 华文吴"},];
let resultCache= new Map<string,string>(); //global scope



export const lambdaHandler = async (event: any): Promise<APIGatewayProxyResult> => {
    try {
        if (event.httpMethod !== 'POST') {
            throw new Error(`postMethod only accepts POST method, you tried: ${event.httpMethod} method.`);
        }
        console.info('received:', event);
        const body = JSON.parse(event.body);
        let name = body.name;
        if(!name || !name.trim()){
            return {
                statusCode: 400,
                body: "",
            }; 
        }
        name=name.trim();
        if(resultCache.has(name)){
            return {
                statusCode: 200,
                body: resultCache.get(name),
            }; 
        }
        const messages = [...promptMessages];
        messages.push({"role": "user", "content": name});

        const params:OpenAI.Chat.ChatCompletionCreateParamsNonStreaming={
          model: "gpt-3.5-turbo",
          messages:messages,
          stream:false,
          
        };
        const completion: OpenAI.Chat.ChatCompletion = await openai.chat.completions.create(params);
        const answer = completion.choices[0].message.content;
        if(!resultCache.has(name)){
            resultCache.set(name,answer);
        }


        return {
            statusCode: 200,
            body: answer,
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify(err),
        };
    }
};

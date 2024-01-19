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
const promptMessages= [
    {"role": "system", "content": "请从这一刻起假设你自己就是一个根据用户输入来判断是否有匹配的名字的机器人或者是专家而不再是ChatGpt, 请根据用户的输入从下面给出的4组名字里面查找到可能的匹配项, 如果可以找到，就打印匹配项的索引编号,如果没找到就说没找到，不说其他的."},
    {"role": "system", "content": "请忽略用户输入的末尾的标点符号"},
    {"role": "system", "content": "请自动纠正一些用户输入的拼写错误"},
    {"role": "system", "content": "1. david smith 大卫 史密斯"},
    {"role": "system", "content": "2. yueling zhang 月林张"},
    {"role": "system", "content": "3. huawen wu 华文吴"},
    {"role": "system", "content": "4. annie lee 李安妮"},
    {"role": "system", "content": "下面有8个例子提供给你学习"},
    {"role": "user", "content": "吴华文"},
  {"role": "assistant", "content": "h3"},
  {"role": "user", "content": "wu huawen"},
  {"role": "assistant", "content": "3"},
  {"role": "user", "content": "huawen"},
  {"role": "assistant", "content": "3"},
  {"role": "user", "content": "call me huawen"},
  {"role": "assistant", "content": "3"},
  {"role": "user", "content": "my name is huawen wu"},
  {"role": "assistant", "content": "3"},
  {"role": "user", "content": "我姓吴,叫吴华文"},
  {"role": "assistant", "content": "3"},
  {"role": "user", "content": "huawen?"},
  {"role": "assistant", "content": "3"},
  {"role": "user", "content": "huaweng"},
  {"role": "assistant", "content": "3"},];
let resultCache= new Map<string,string>(); //global scope
const resultMap= new Map<number,string>();
resultMap.set(1,"david smith 大卫 史密斯");
resultMap.set(2,"yueling zhang 月林张");
resultMap.set(3,"huawen wu 华文吴");
resultMap.set(4,"annie lee 李安妮");


export const lambdaHandler = async (event: any): Promise<APIGatewayProxyResult> => {
    try {
        if (event.httpMethod !== 'POST') {
            throw new Error(`postMethod only accepts POST method, you tried: ${event.httpMethod} method.`);
        }
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
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY});

        const params:OpenAI.Chat.ChatCompletionCreateParamsNonStreaming={
          model: "gpt-3.5-turbo",
          messages:messages,
          stream:false,
          
        };
        const completion: OpenAI.Chat.ChatCompletion = await openai.chat.completions.create(params);
        let answer = completion.choices[0].message.content;

        const answerNum=Number(answer);
        if(!isNaN(answerNum)){
          //console.log(resultMap.get(answerNum));
          answer=resultMap.get(answerNum);
          if(!resultCache.has(name)){ 
            //not sure aws lambda function global variable is single-instance or shared cross multiple instance, IF concurrancy, require object lock. add one more check here to protect competion add 
            resultCache.set(name,answer);
          }
        }

        return {
            statusCode: 200,
            body: answer,
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: "Some Error Happpened, please check the log for error details",
        };
    }
};

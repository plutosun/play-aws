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
const promptMessages= [{"role": "system", "content": "假设你是一名专业寻找人名发现和提取的机器人, 请从每一句用户的输入里面提取可能的人名, 并且和下面提供的带索引号的人名列表进行匹配, \
回答的名字一定要从给出的名利列表里面选取 \
对于你不确定的匹配也要直接输出你认为最接近的,匹配度或者相似度最高的那个名字,不要再次询问用户也不要有其他交互. \
给出答案同时一定要你认为可能匹配的或者你选取的那个名字的索引号作为参数发给已知的函数findNameByIndex\
请忽略用户输入的末尾的标点符号,尤其是问号\
这五组包括英文和中文的名字和索引是:\
1. david smith 大卫 史密斯 \
2. yueling zhang 月林张 \
3. huawen wu 华文吴 \
4. annie lee 李安妮 \
 "}];
let resultCache= new Map<string,string>(); //global scope
const resultMap= new Map<number,string>();
resultMap.set(1,"david smith 大卫 史密斯");
resultMap.set(2,"yueling zhang 月林张");
resultMap.set(3,"huawen wu 华文吴");
resultMap.set(4,"annie lee 李安妮");



const findNameByIndex=(nameIndex:number, similarities:[]):string=>{
  if(nameIndex<=0){
    return "";
  }
  const answer = resultMap.get(nameIndex);
  return answer?answer:"Not found";
}

const availableFunctions :any={
  "findNameByIndex":findNameByIndex
};

const findNameFunction= [{
  name:"findNameByIndex",
  description:"return the user full name inlcuding english name and chinese name based on possible index number",
  parameters: {
    type:"object",
    required:["nameIndex","similarities"],
    properties:{
      nameIndex:{
        type:"number",
        description:"the index number of matched name"
      },
      similarities: {
        type: "array",
        description: "The full list of similarity of each provided name in the known name list ordered by similarity in descending way , item format 'index-similarity-name'",
        items: {
            type: "object",
            properties:{
              index:{
                type:"number",
                description:"the index number of the item in the known name list"
              },
              similarity:{
                type:"number",
                description:"the similarity of the item"
              },
              name:{
                type:"string",
                description:"the name of the item"
              }
            }
        }
    },
  }
},

}];


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
          functions: findNameFunction,
          function_call: "auto",
          temperature:0.00000001
        };
        const completion: OpenAI.Chat.ChatCompletion = await openai.chat.completions.create(params);
        // const answer = completion.choices[0].message.content;
        // console.log(JSON.stringify(completion.choices[0].message));
        const jsonFunc = completion.choices[0].message.function_call;
        let answer = "Not found";
        if(jsonFunc){
            const jsonFuncArgs = jsonFunc.arguments;
            const funcName = jsonFunc.name;
            const funcArguments = JSON.parse(jsonFuncArgs);
            console.log(funcArguments);
            const func=availableFunctions[funcName];

            answer=func(funcArguments.nameIndex, funcArguments.similarities)
            console.log(answer);

            if(funcArguments.nameIndex>0){
                if(!resultCache.has(name)){ 
                    resultCache.set(name,answer);
                }
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

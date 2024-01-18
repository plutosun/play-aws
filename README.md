# Learning Curve

## How to Play
+ Http Definition 
```bash
https://6nawpe09d3.execute-api.ap-southeast-2.amazonaws.com/Prod/hello
POST
Request Body:
{
    "name": "安妮李"
}
```

+ [PostMan Collection Json](https://github.com/plutosun/play-aws/blob/main/everyoung.postman_collection.json)
+ Download the json file from link above and import to postman app, only 1 api, just click to test

## Setup accounts
+ Github
+ Aws
+ openAI

## Setup local lambda devevelopment env:
+ Install aws cli and register aws credentials
+ Install aws sam cli

## Study how to build basic lambda via sam templates 
+ Start from helloworld ts template
+ Update event js with real my design
+ Update template.yaml to support HTTP POST only
+ Learn how to pass parameter from event request parameters


## Study on best prompt via ChatGpt chat
+ Try adjust prompt to let answer accurate and same as requested

## Write code with open Ai library
+ TODO

## Deploy to lambda function
+ TODO
import dotenv from 'dotenv'

//important this line
dotenv.config();
type ProjectConfig={
    // developerName:string|undefined
    // serviceName:string|undefined
    // version:string|undefined
    port:string|undefined
}

export const environment=process.env.environment

export let server:ProjectConfig={
    // developerName:process.env.developerName||'none',
    // serviceName:process.env.serviceName||'none',
    // version:process.env.version||'latest',
    port:process.env.port||"1000",
}

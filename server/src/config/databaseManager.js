import dotenv from "dotenv";
import mysql from "mysql2/promise"; // we are using promise feature of mysql tp use await

dotenv.config(); //initialised env file

//we will load client pool objects into this mapper
const dbPools = new Map();

//creating a pool object for admin
export const adminPool= mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_ADMIN_USER,      // user with CREATE DATABASE privilege
    password: process.env.DB_ADMIN_PASS,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 5,
});

//creating a pool object for client database 
export const getPoolForDB= (dbName) =>{
    if(!dbName) throw new Error('dbName is required');

    if(dbPools.has(dbName)) return dbPools.get(dbName);

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,          // regular db user 
        password: process.env.DB_PASSWORD,
        database: dbName,
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,  //limits only 10 connections that is upto 10 clients, 11th one should wait
        queueLimit: 0,
    });

    dbPools.set(dbName,pool);
    console.log(`Created connection pool for ${dbName}`);
    return pool; //we will run queries with this
};

//in case of emergency cut all pools(Use only when needed) !Warning: will cut admin connection!
export const closeAllPools =async () =>{
    for(const[name, pool] of dbPools){
        try{
            await pool.end();
            console.log(`closed pool ${name}`);
        }catch(err){
            console.error(`Error closing pool ${name}`);
        }
    }

    try{await adminPool.end();} catch(e){} // cutting admin pools
};


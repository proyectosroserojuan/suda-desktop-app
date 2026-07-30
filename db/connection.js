/*
const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "127.0.0.1",
  database: "consultorio_medico",
  password: "Admin123456",
  //port: 5432,
});

module.exports = pool;
*/


const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "DESKTOP-SA0N",
  database: "consultorio_medico",
  password: "Admin123456",
  port: 5432,
  family: 4
});

module.exports = pool;



/*
const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "DESKTOP-SANING", 
  database: "consultorio_medico",
  password: "audio55pro",  
  port: 5432,
  family: 4,

});

module.exports = pool;
*/









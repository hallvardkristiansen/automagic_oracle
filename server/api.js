'use strict'

/**
 * Public API.
 */

const express = require('express');
const request = require('request');
const publicapi = express.Router();
  

publicapi.get("/:symbol", async (req, res) => {
  var symbol = req.params.symbol;
  const apiurl = 'https://api.iextrading.com/1.0/stock/'+symbol+'/chart/5y';
  var data;
  var responsecode;
  request({
    method: 'GET',
    uri: apiurl
  }, function (error, response, body){
    responsecode = response.statusCode;
    if (!error && response.statusCode == 200){
      data = JSON.parse(body);
      return res.send({status: responsecode, data: data});  
    } else {
      data = JSON.parse(error);
      return res.send({status: responsecode, data: data});  
    }
  });
});

console.log(`Public API initialized`);

module.exports = publicapi;
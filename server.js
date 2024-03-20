const fs = require("fs")
const csvParser = require("csv-parser")
const axios = require("axios")
var express = require('express');
var app = express();
var { Parser } = require('json2csv')
var http = require('follow-redirects').http;
var request = require('request');
const { text } = require("stream/consumers");
var https = require('follow-redirects').https;
var timeout = require('connect-timeout')
var parsedData = [];
var filePath = "https://scoopcoupons.com/sam.csv";
let port = process.env.PORT || 9000
app.get('/', async function (req, res) {
    await parseCSVFile(filePath, res)
})
app.use(timeout('25s'))
app.use(haltOnTimedout)
app.listen(port);

function haltOnTimedout (req, res, next) {
    if (!req.timedout) next()
  }

async function parseCSVFile(filePath, res) {


    await axios.get(filePath, { responseType: 'stream' }).then(function (response) {
        let csvData = response.data
        //   console.log(csvData); // this is a stream now..

        csvData.pipe(csvParser({ headers: true }))
            .on('data', function (data) {
                parsedData.push(data)

            })
            .on('end', function () {

               //   parsedData.splice(0, 2000)  
              parsedData.splice(500, 173749)  // Change this to get more store
                console.log(parsedData.length)
                test(res)
                console.log('CSV data parsed');
            })
            .on('error', function () {
                console.log("Error parsing CSV data");
            })
    })

};

const isValidUrl = urlString => {
    try {
        return Boolean(new URL(urlString));
    }
    catch (e) {
        return false;
    }
}




function test(res) {
    var fields_data=[];
    var promise = parsedData.map(async (item, index) => {
        var url = item._3;
        //   console.log(index)
        if (/(http(s?)):\/\//i.test(url)) {

            if (isValidUrl(decodeURIComponent(url))) {
                url = new URL(decodeURIComponent(url))
                var client = http;
                client = (url.protocol == "https:") ? https : client;
                //console.log(url.href)
                return await checkWebsite(url, client, item)


            }


        }


    })
    Promise.all(promise).then(function (values) {
        console.log(values.length);
        values.map((item1) => {
            if (item1) {
                if (!item1.status) {
                    fields_data.push({ store_id: item1.store._0, store_url: item1.store._2, store_aff_url: item1.store._3 })
                }
            }
        });

        const fields = [{
            label: 'store_id',
            value: 'store_id'
        }, {
            label: 'store_url',
            value: 'store_url'
        },
        {
            label: 'store_aff_url',
            value: 'store_aff_url'
        }
        ]
        const json2csv = new Parser({ fields: fields })
        console.log("fields",fields_data.length)
        try {
            const csv = json2csv.parse(fields_data)
            res.attachment('data.csv')
            res.status(200).send(csv)
        } catch (error) {
            console.log('error:', error.message)
            res.status(500).send(error.message)
        }
    });
}

//test()

function checkWebsite(url, client, store) {

    return new Promise((resolve, reject) => {


        var options = {
            'method': 'GET',
            'url': url.href,
            timeout: 60000,
            rejectUnauthorized: false,
            requestCert: true,
            agent: false,
            'headers': {
                'Cookie': 'muc=5030166a-554e-4a38-8ad5-d0f19b3fb9d4; muc_ads=5030166a-554e-4a38-8ad5-d0f19b3fb9d4'
            }
        };
        // console.log(options)
        request(options, function (error, response) {
            if (error) {
                console.log(store._3)
                resolve({ "status": false, "store": store });
            }
            else {

                if (response) {
                    if (JSON.stringify(response.body).includes("Sorry, this store is currently unavailable.") || JSON.stringify(response.body).includes("This store does not exist.")) {
                     
                        resolve({ "status": false, "store": store });
                        return false;
                    }
                }
               // console.log(store._3)
                resolve({ "status": true, "store": store });
            }
        });

    })
}
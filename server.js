const fs = require("fs")
const csvParser = require("csv-parser")
const axios = require("axios")
const cheerio = require("cheerio");
var express = require('express');
var app = express();
var http = require('follow-redirects').http;
var { Parser } = require('json2csv')
var request = require('request');
const { text } = require("stream/consumers");
var https = require('follow-redirects').https;
var parsedData = [];
var filePath = "https://scoopcoupons.com/sam.csv";

app.get('/', async function (req, res) {
    await parseCSVFile(filePath,res)
})


app.listen(9000);

async function parseCSVFile(filePath,res) {


    await axios.get(filePath, { responseType: 'stream' }).then(function (response) {
        let csvData = response.data
        //   console.log(csvData); // this is a stream now..

        csvData.pipe(csvParser({ headers: true }))
            .on('data', function (data) {
                parsedData.push(data)

            })
            .on('end', function () {

              parsedData.splice(0, 1000)  
                parsedData.splice(1000, 171749)  // Change this to get more store
                console.log(parsedData.length)
                 test(res)

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
    var fields_data = [];
    Promise.all(promise).then(function (values) {
        //console.log(values);
        values.map((item1) => {
            if (item1) {
                if (item1.status) {
                    fields_data.push({ store_id: item1.store._0, store_url: item1.store._2,store_aff_url: item1.store._3, store_scrap_title: item1.title ? item1.title : "", store_scrap_desc: item1.desc ? item1.desc : "" })

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
           label:'store_aff_url',
           value:'store_aff_url'
        },
        {
            label: 'store_scrap_title',
            value: 'store_scrap_title'
        },
        {
            label: 'store_scrap_desc',
            value: 'store_scrap_desc'
        }
        ]
        const json2csv = new Parser({ fields: fields })
    
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
            rejectUnauthorized: false,
            followAllRedirects: true,
            timeout: 120000,
            requestCert: true,
            agent: false,
            'headers': {
                'Cookie': 'muc=5030166a-554e-4a38-8ad5-d0f19b3fb9d4; muc_ads=5030166a-554e-4a38-8ad5-d0f19b3fb9d4'
            }
        };
        // console.log(options)
        request(options, function (error, response, html) {
            if (error) {

                //  console.log(store)
                resolve({ "status": false, "store": store });
            }
            else {
                var desc = "";
                var title = "";
                if (response) {
                    if (JSON.stringify(response.body).includes("Sorry, this store is currently unavailable.")) {
                        //  console.log(store)
                        resolve({ "status": false, "url": store });
                        return false;
                    }
                    const $ = cheerio.load(html);

                    desc = $("meta[name='description']").attr("content");
                    title = $('head > title').text();
                    // console.log(url.href,title);
                }

                resolve({ "status": true, "store": store, "desc": desc, "title": title });
            }
        });

    })
}
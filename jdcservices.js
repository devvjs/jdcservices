// JDCOnline Source Code
// This file was created on April 27, 2021 01:18 AM

// -- Modules
// -- Global
let app = require("express")();
let axios = require("axios");
let fs = require("fs");
// --

// --

// Main server configuration, access-able from anywhere.
let jdconline = {
  // Status codes.
  statusCodes: {
    banned: 401,
    invalidTicket: 401,
    invalidSkuId: 400,
    missingHeader: 403,
    missingData: 400,
    serverError: 500
  },
  // Server URLs
  urls: {
    ubiservices: {
      prod: "public-ubiservices.ubi.com"
    },
    jmcs: {
      prod: "jmcs-prod.just-dance.com"
    },
    jdco: {
      prod: "prod-jdco.justdancebest.tk"
    },
    jdcs: {
      prod: "jdcs-prod.justdanceonline.net",
      cert: "jdcs-cert.justdanceonline.net",
      local: "localhost:1300"
    }
  },
  // Local Mode (turns developer entities to localhost)
  localMode: true
};
exports.jdconline = jdconline;

// MIDDLEWARE
const JDCServicesMiddleware = async function(req, res, next) {
  if (!req.header("authorization") || !req.header("ubi-appid")) {
    return res.status(400).send() 
  }
  else {
    next()
  }
};

// -- ROUTES

// -- SESSIONS
// Generate authorization ticket for client.
app.post("/:apiVersion/profiles/sessions", JDCServicesMiddleware, async (req, res) => {
    axios.post(`https://${jdconline.urls.ubiservices.prod}${req.originalUrl}`, {}, {
          headers: {
            authorization: req.header("authorization") || "",
            "ubi-appid": "341789d4-b41f-4f40-ac79-e2bc4c94ead4",
            host: jdconline.urls.ubiservices.prod
          }
      })
      .then(response => {
        res.send(response.data);
      })
      .catch(error => {
        res.status(400).send();
      });
  }
);

app.delete("/*/profiles/sessions", JDCServicesMiddleware, async (req, res) => {
  
  axios.delete(`https://${jdconline.urls.ubiservices.prod}${req.originalUrl}`, {
      headers: {
        Authorization: req.header("authorization") || "",
        "Ubi-AppId": "341789d4-b41f-4f40-ac79-e2bc4c94ead4",
        Host: jdconline.urls.ubiservices.prod
      }
    })
    .then(response => {
      res.send(response.data);
    })
    .catch(error => {
      res.status(error.response.status).send(error.response.data);
    });
});



// -- USERS
// User information.
app.get("/*/users/:uuid", JDCServicesMiddleware, async (req, res) => {
  axios
    .get(`https://${jdconline.urls.ubiservices.prod}${req.originalUrl}`, {
      headers: {
        Authorization: req.header("authorization") || "",
        "Ubi-AppId": "341789d4-b41f-4f40-ac79-e2bc4c94ead4",
        Host: jdconline.urls.ubiservices.prod
      }
    })
    .then(response => {
      res.send(response.data);
    })
    .catch(error => {
      res.status(error.response.status).send(error.response.data);
    });
});



// -- SPACES
// Information such as server url for app.
app.get("/*/spaces/:spaceId/entities", JDCServicesMiddleware, (req, res) => {
  let devAccounts = require("./settings/developerAccounts.json");
  let certAccounts = require("./settings/testerAccounts.json");
  
  let spaceId = req.params.spaceId;
  let name = req.query.name
  
  // Fix authorization, solution 100% made in portugal lisbon #lgbt #lesbianrights
  let authorization;
  switch (req.header("authorization").includes("t=")) {
    case true:
      authorization = req.header("authorization")
      break;
    case false:
      authorization = req.header("authorization").replace("Ubi_v1 ", "Ubi_v1 t=")
      break;
  }
  
  // If spaceId or name query does not exist...
  if (!spaceId) {
    return res.status(400).send();
  }
  
  
  // Check if the authorization uid or pid is a developer account.
  axios.get(`https://${jdconline.urls.ubiservices.prod}/v1/users/me`, {
      headers: {
        authorization: authorization,
        "ubi-appid": "341789d4-b41f-4f40-ac79-e2bc4c94ead4",
        host: jdconline.urls.ubiservices.prod
      }
    })
  
    .then(response => {
  
      // We received the response now filter and send entities depending on the status of the user.
      if (fs.existsSync(`./spaces/${spaceId}`)) {
        
        let entitiesFile = JSON.parse(fs.readFileSync(`./spaces/${spaceId}/entities.json`))

        // Check if user's pid or uid is in developer accounts JSON.
        // THIS IS FOR LOCAL DEVELOPERS !!
        if (devAccounts[response.data.userId] || devAccounts[response.data.profileId]) {
          
          console.log(`${response.data.username} was forwarded to a local server.`);
          
          return res.send({
              entities: [{
                "entityId": "cd8593dc-2d53-449c-9dbd-cc43ebb7d3d4",
                "spaceId": "f1ae5b84-db7c-481e-9867-861cf1852dc8",
                "type": "server",
                "name": "default",
                "tags": [],
                "obj": {
                  "name": "LOCAL",
                  "url": "http://127.0.0.1:1300"
                },
                "lastModified": "",
                "revision": 6
              }]
            })
        }
        
        // Check if user's pid or uid is in testers accounts JSON.
        // THIS IS FOR CERT USERS !!
        if (certAccounts[response.data.userId] || certAccounts[response.data.profileId]) {
          
          console.log(`${response.data.username} was forwarded to a cert server.`);
          
          var testServers = entitiesFile.filter(entity => { return entity.testServer })

          testServers.forEach(function(part, i) {
            this[i]["name"] = "default";
          }, testServers);
          
            return res.send({
              entities: testServers
            })
        }
        
        // User is not a developer so send the whole array.
        else {
          return res.send({
              entities: entitiesFile
          })
        }
        
      } else {
        res.status(400).send();
      }
    
    
    
    })
  
    .catch(error => {
      res.status(error.response.status).send(error.response.data)
      res.status(400).send();
    });

});


// -- APPLICATIONS
// Configuration for applications.
app.get("/*/applications/:appId/configuration", JDCServicesMiddleware, (req, res) => {
    let appId = req.params.appId;

    if (fs.existsSync(`./applications/${appId}/configuration.json`)) {
      res.send(require(`./applications/${appId}/configuration.json`));
    } else {
      res.status(400).send();
    }
  }
);


// -- NEWS
// In-game news for applications.
// Coded by digo. digo good person
app.get("/*/profiles/me/news", JDCServicesMiddleware, (req, res) => {
  let spaceId = req.query["spaceId"];
  let newsJson = require("./profiles/me/news");
  
  // Get language. If no language, everyone is American.
  let lang = req.headers["ubi-localecode"].split("-")[0] || "en";
  
  // Filter news by spaceId.
  let filteredNews = newsJson["news"].filter(element => element["spaceId"] === spaceId);
  
  // Response body.
  let response = {
    "news": []
  }
  
  filteredNews.forEach((news) => {
    // Grab translations.
    let translations; 
    
    // If translations has language, use it, otherwise English.
    if (newsJson["translations"][news["newsId"]][lang]) translations = newsJson["translations"][news["newsId"]][lang]
    else {
      translations = newsJson["translations"][news["newsId"]]["en"]
    }
    
    news["title"] = translations[0];
    news["body"] = translations[1];
    news["locale"] = req.headers["ubi-localecode"].toLowerCase();
    
    response["news"].push(news);
  });
  
  res.send(response);
});



// Rest of the routes should return 400.
app.all("/*", (req, res) => {
  res.status(400).send();
});



app.use(function(err, req, res, next) {
  if (err) {
    console.log(err)
    res.status(500).send();
  }
});

// --

const listener = app.listen(process.env.PORT, function() {
  console.log("JDCServices (re)started on PORT :: " + process.env.PORT);
});

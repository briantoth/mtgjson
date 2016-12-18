var req = require('request');
var fs = require('fs');
var path = require('path');

var URL = 'http://mtgjson.com/json/AllSets-x.json';
var ETAG_FILE = path.join(__dirname, 'data/etag');
var DATA_FILE = path.join(__dirname, 'data/AllSets-x.json');
var MIN_FILE = path.join(__dirname, 'data/AllSets-x-min.jsonp');
var CARDS_FILE = path.join(__dirname, 'data/CardNames.jsonp');


function convertToCards(data) {
    var cardNames = {};
    var parsed = JSON.parse(data);
    for (var set in parsed) {
        for (var i = 0; i < parsed[set].cards.length; i++) {
            var card = parsed[set].cards[i];
            if (!(card.name in cardNames)) {
                cardNames[card.name] = {};
            }
            cardNames[card.name][set] = i;
            if (card.hasOwnProperty("foreignNames")) {
                for (var j=0; j<card.foreignNames.length; j++) {
                    delete card.foreignNames[j].name;
                    delete card.foreignNames[j].multiverseid;
                }
            }
            parsed[set].cards[i] = {
                "foreignNames": card.foreignNames,
                "multiverseid": card.multiverseid,
                "rarity": card.rarity
            };
        }
    }
    fs.writeFile(MIN_FILE, "allSetsXCallback(" + JSON.stringify(parsed) + ");", function(err) {
        if (err) {
            console.log(err);
            return 1;
        }
        fs.writeFile(CARDS_FILE, "cardNamesCallback(" + JSON.stringify(cardNames) + ");", function(err) {
            if (err) {
                console.log(err);
                return 1;
            }
        });
    });
}

fs.readFile(ETAG_FILE, function(err, data) {
    if (err) {
        console.log(err);
        return 1;
    }

    var localEtag = data.toString();

    req(URL, {headers:{'if-none-match':localEtag}}, function(err, res) {
        var noInternetConnection = !!err;
        if (noInternetConnection) {
            console.log(err);
            return 1;
        }

        if (res.statusCode === 304) {
            return fs.readFile(DATA_FILE, function(err, data) {
                if (err) {
                    console.log(err);
                    return 1;
                }
               return  convertToCards(data);
            });
        }

        fs.writeFile(DATA_FILE, res.body, function(err) {
            if (err) {
                console.log(err);
                return 1;
            }
            fs.writeFile(ETAG_FILE, res.headers.etag, function(err) {
                if (err) {
                    console.log(err);
                    return 1;
                }
                return convertToCards(res.body);
            });
        });
    });
});

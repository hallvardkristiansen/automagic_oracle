var l1;
var l2;
var testhighs;
var testinput;
var correctoutput;
var groundtruth;
var displayedinputs;
var graphdata;
var enddate;
var predict_period = 30;
var data_length = 2954;
var scale;
var volscale;
var batch_size = 10;
var epochs = 1000;    
var symbol = 'aapl';
var prediction_fraction = 0.5;

const init = {
  method: 'GET',
  headers: new Headers(),
  mode: 'cors',
  cache: 'default'
}

const fetchWrapper = function (url) {
  return new Promise(function (resolve, reject) {
    fetch(url, init)
      .catch(function (err) {
        console.error('Error fetching data, check your internet connection. ' + err)
      })
      .then(function (success) {
        let r
        try { r = success.json() }
        catch (ex) { console.error(ex) }
        return r
      })
      .then(function (secondSuccess) {
        return resolve(secondSuccess.data)
      })
  })
}

const print = function (text) {
  let el = document.getElementsByClassName('cnn')[0]
  el.append(document.createTextNode(text))
  el.append(document.createElement('br'))
  console.log(text)
}


/*  "Date": "Jan 09, 2013",
  "Price": 26.70,
  "Open": 26.72,
  "High": 26.75,
  "Low": 26.56,
  "Vol": 49.05 */

const prep = function (data) {
  return new Promise(function (resolve, reject) {
    let dates = [], opens = [], closes = [], highs = [], lows = [], volumes = [];
    try {
      var countdate = moment(data[0]['date']);
      var lastclose = data[0]['close'];
      var lastvolume = data[0]['volume'];
      $.each(data, function(index, el) {
        var date = moment(el['date']);
        if (date.isSame(countdate)) {
          dates.push(countdate.valueOf());
          opens.push(el['open']);
          closes.push(el['close']);
          highs.push(el['high']);
          lows.push(el['low']);
          volumes.push(el['volume']);
          lastclose = el['close'];
          lastvolume = el['volume'];
          countdate.add(1, 'days');
        } else {
          while (countdate.isSameOrBefore(date)) {
            dates.push(countdate.valueOf());
            opens.push(lastclose);
            closes.push(lastclose);
            highs.push(lastclose);
            lows.push(lastclose);
            volumes.push(lastvolume);
            countdate.add(1, 'days');
          }
        }
      });
      timeline = dates.slice(-predict_period);
      groundtruth = closes.slice(-predict_period);
      displayedinputs = opens.slice(-predict_period);
      
      var maxa = d3.max(opens);
      var maxb = d3.max(closes);
      var max = d3.max([maxa, maxb]);
      scale = d3.scale.linear().domain([0, max]).range([0, 1]);
      volscale = d3.scale.linear().domain([d3.min(volumes), d3.max(volumes)]).range([0, 1]);
      var normalizedinputs = [];
      var normalizedoutputs = [];
      var tmpa = [];
      var tmpb = [];
      dates.pop();
      $.each(dates, function(index, el) {
        normalizedinputs.push([scale(lows[index]), scale(highs[index]), scale(opens[index]), scale(closes[index]), volscale(volumes[index])]);
        normalizedoutputs.push([scale(lows[index+1]), scale(highs[index+1]), scale(opens[index+1]), scale(closes[index+1]), volscale(volumes[index+1])]);
      });
      testinput = normalizedinputs.splice(-predict_period, predict_period);
      var lastday = dates.length;
      testinput.push([scale(lows[lastday]), scale(highs[lastday]), scale(opens[lastday]), scale(closes[lastday]), volscale(volumes[lastday])]);
      normalizedoutputs.splice(-predict_period, predict_period);
    } catch (ex) {
      resolve(ex)
      console.log(ex)
    }
    return resolve({
      dates: dates,
      opens: opens,
      closes: closes,
      volumes: volumes,
      normins: normalizedinputs,
      normouts: normalizedoutputs
    })
  })
}

const modelHelper = function(model) {
  console.log("MODEL SUMMARY: ")
  model.summary()
}

var model;
const buildCnn = function (data) {
  console.log(data);
  return new Promise(function (resolve, reject) {
    model = tf.sequential()
    model.add(tf.layers.dense({
      inputShape: [, 5],
      units: 20,
      activation: 'linear'
    }));
    model.add(tf.layers.dense({
      units: 200,
      activation: 'linear'
    }));
    model.add(tf.layers.dense({
      units: 5,
      activation: 'linear'
    }));
    return resolve({
      'model': model,
      'data': data
    })
  })
}

const cnn = function (model, data, epochs) {
  modelHelper(model)
  return new Promise(function (resolve, reject) {
      try {
        const inputs = tf.tensor2d(data.normins).reshape([1, data.normins.length, 5]);
        const outputs = tf.tensor2d(data.normouts).reshape([1, data.normouts.length, 5]);
        const learningRate = 0.1;
        const sgdOptimizer = tf.train.sgd(learningRate);
        model.compile({optimizer: sgdOptimizer, loss: 'meanSquaredError'});
        model.fit(inputs, outputs, {
          batchSize: batch_size,
          epochs: epochs
        }).then(function(response) {
          const loss = response.history.loss[0];
          console.log('Train Loss:', loss);
          resolve();
        });
      } catch (ex) {
        resolve(print(ex))
      }
  })
}
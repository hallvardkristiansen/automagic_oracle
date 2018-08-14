function reset_display() {
  $('#current_activity').empty();
  $('#share_symbol').empty();
  $('#dataset_length').empty();
  $('#dataset_start').empty();
  $('#dataset_end').empty();
  $('#predicting_from').empty();
  $('#conclusion').empty();
}

$(function() {
  $('#train').click(function() {
    reset_display();
    model = {};
    $('#graph1').empty();
    epochs = $('#epochs').val();    
    symbol = $('#symbol').val();
    batch_size = $('#batch').val();
    prediction_fraction = $('#prediction').val();
    $('#current_activity').html('Fetching data...').addClass('processing');
    $('#share_symbol').html('Share symbol: ' + symbol);

    fetchWrapper(window.location.href + 'api/' + symbol).then(function (data) {
      $('#current_activity').html('Preparing data...');
      $('#dataset_length').html('Received ' + data.length + ' data points');
      $('#dataset_start').html('Data begins at ' + moment(data[0]['date']).format('DD/MM - YYYY'));
      $('#dataset_end').html('Data ends at ' + moment(data[data.length-1]['date']).format('DD/MM - YYYY'));
      predict_period = $('#value').val();
      prep(data).then(function (result) {
        $('#current_activity').html('Constructing network...');
        buildCnn(result).then(function (built) {
          $('#current_activity').html('Training network for ' + epochs + ' epochs');
          var prediction_starts = Math.round(testinput.length * prediction_fraction);
          var prediction_initial_value;
          cnn(built.model, built.data, epochs).then(function (e) {
            var predictions = Array();
            var lastprediction;
            $.each(testinput, function(index, el) {
              if (index < prediction_starts) {
                var inputval = tf.tensor2d(el, [1, 5]);
              } else {
                var inputval = tf.tensor2d(lastprediction, [1, 5]);
                if (index == prediction_starts) {
                  $('#predicting_from').html('Predicting from: ' + moment(timeline[index]).format('DD/MM - YYYY'));
                  prediction_initial_value = lastprediction[3];
                }
              }
              inputval = inputval.reshape([1, 1, 5]);
              tf.tidy(() => {
                const prediction = model.predict(inputval);
                const values = prediction.dataSync();
                const arr = Array.from(values);
                predictions.push(scale.invert(arr[3]));
                lastprediction = arr.slice();
              });
            });
            $('#current_activity').html('Displaying data for: ' + symbol).removeClass('processing');
            var miny1 = d3.min(groundtruth);
            var miny2 = d3.min(predictions);
            var maxy1 = d3.max(groundtruth);
            var maxy2 = d3.max(predictions);
            var miny = d3.min([miny1, miny2]);
            var maxy = d3.max([maxy1, maxy2]);
            graphdata = {
              "start": moment(timeline[0]).valueOf(),
              "end": moment(timeline[timeline.length - 1]).valueOf(),
              "step": 86400000,
              "names": [symbol.toUpperCase(), "Prediction"],
              "values": [groundtruth, predictions],
              "displayNames": [symbol.toUpperCase(), "Prediction"],
              "colors": ["green", "red"],
              "scale": "linear",
              "minval": miny,
              "maxval": maxy
            };
            l1 = new LineGraph({containerId: 'graph1', data: graphdata});
            
            const conclusion = predictions[predictions.length - 1] > prediction_initial_value ? 'BUY' : 'SELL';
            $('#conclusion').html('The Oracle says: ' + conclusion);
          })
        })
      })
    });
  });  
});
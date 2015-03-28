var app = angular.module('micControllers', ['ribbitAudienceRTC', 'ribbitPresenterRTC', 'ngSanitize']);


app.controller('AuthControl', ['$scope', 'Auth', function($scope, Auth) {

  $scope.normalLogin = function(username, password) {

    var successCb = function(result) {
      console.log('made it to successCB of normalLogin controller');
      $location.url('/main');
    };

    var errorCb = function(err) {
      console.error(err);
      $location.url('/');
    };

    var notifyCb = function(result) {
      console.log(result);
    };

    // console.log(username, password);

    var authPromise = Auth.normalLogin(username, password);

    // console.log(authPromise);

    authPromise.then(function() {
      console.log('promise has resolved');
    }).finally(function(){
      console.log('do something');
    });

    // authPromise
    //   .catch(function(err) {
    //     console.error(err);
    //   })
    //   .then(function(result) {
    //     console.log(result);
    //   });
      // successCb, errorCb, notifyCb);
  };

  $scope.signup = function(username, password) {
    console.log('signing up');
    Auth.signup(username, password)
      .catch(function(err) {
        console.error(err);
      })
      .then(function(result) {
        console.log(result);
      });
  };

  $scope.gitLogin = function() {
    Auth.gitLogin();
    console.log('gitlogin');
  };


}]);

app.controller('MainControl', ['$scope', '$location', 'Room', function($scope, $location, Room) {
  $scope.room;

  $scope.createRoom = function(room) {
    room = room || 'testRoom';
    var roomCheck = Room.tryToMakeRoom(room);
    console.log(roomCheck);
    console.log('let\'s create a room!');
  };

  $scope.joinRoom = function(room) {

    // Send in the roomname to allow the server to check if the room exists.
    // If it does, the server will respond by sending back an object or string
    // that will show who the presenter for the room is.
    // We will use the presenter string/object to tell the audienceRTC who to
    // connect to.

    var returnPresenter = Room.returnPresenter($scope, room); 
    console.log('logging the returnPresenter variable: ', returnPresenter);
    console.log('logging out $scope.room to see if we stored room info: ', $scope.room);
    console.log('let\'s join a room!' , room);
  };

}]);

// The AudienceController utilizes $rootScope to pass user information between controllers.
// This is not an ideal implementation, and the 'Room' service should be utilized instead.

app.controller('AudienceControl', ['$scope', '$sce', 'audienceRTC', '$rootScope',
'$firebaseObject', 'Question', function($scope, $sce, audienceRTC, $rootScope, $firebaseObject, Question) {

  // Initialize micStatus with default settings of power = off (false) and the option to "Turn on your mic!"
  // The power boolean is utilized to determine whether the views mic button will open a new peer connection with the presenter or close an existing connection.
  // The command will toggle based on the power state so the user is aware what will happen.

  console.log('all about the details ------------');
  // console.log($rootScope.details);

  $scope.thumbs = [
    {name: 'rockin\'', src: '../assets/noun_ily-sign_62772.png', id: 0, selected: false},
    {name: 'thumbs up', src: '../assets/noun_thumbs-up_61040.png', id: 1, selected: false},
    {name: 'thumbs middle', src: '../assets/noun_thumb_104590.png', id: 2, selected: true},
    {name: 'thumbs down', src: '../assets/noun_thumbs-down_61036.png', id: 3, selected: false},
    {name: 'I\'m bored.', src: '../assets/noun_sleep_10297.png', id: 4, selected: false}
  ]
  var roomname = $rootScope.details.roomname.slice();
  var username = $rootScope.details.username.slice();

  $scope.micStatus = {power: false, command: "Turn on your mic!"};
  var ref = new Firebase('https://popping-inferno-6077.firebaseio.com/');
  var audienceSync = $firebaseObject(ref.child(roomname));
  audienceSync.$bindTo($scope, 'audience').then(function(){
    $scope.audience.size ? $scope.audience.size++ : $scope.audience.size = 1;
    $scope.audience[username] = {name: username, speaking: false, thumb: 2};
  });

  $scope.leaveAudience = function(event){
    $scope.audience.size--;
    delete $scope.audience[username];
  };

  window.addEventListener('beforeunload', function(event){
    var confirmationMessage = "Please use the exit button to leave the room, or a kitten will die.\n  _ _/|\n \\'o.0'\n =(___)=\n    U";
    (event || window.event).returnValue = confirmationMessage;
    return confirmationMessage;   
  });

  $scope.$on('$locationChangeStart', function(event){
    $scope.leaveAudience();
  });

  $scope.$on('$destroy', function(event){
    $window.beforeunload = undefined;
  });

  $scope.submitThumb = function(thumb){
    $scope.audience[username].thumb = thumb;
    $scope.thumbs.forEach(function(th){
      if (th.id === thumb) th.selected = true;
      else th.selected = false;
    })
  };
  $scope.submitQuestion = function(question) {
    if ($scope.question) {
      Question.addQuestion(question, username, roomname)
      .then(function(question){
        $scope.question = '';
        $scope.confirmQuestion = 'Question submitted.';
      });
    }
  };

  // only provide connect and disconnect functionality after ready (signal server is up, we have a media stream)

  audienceRTC.ready(function () {
    $scope.roomName = $rootScope.details.roomname.slice();
    $scope.presenter = $rootScope.details.presenter.slice();
    $scope.username = $rootScope.details.username.slice();
    // access local media stream in audienceRTC.localStream
    // to use as a src in the DOM, you must run it through a couple functions:
    // - window.URL.createObjectURL to transform the stream object into a blob URL
    // - $sce.trustAsResourceUrl to let angular know it can trust the blob URL
    //   you need to inject $sce as a dependency (part of angular-sanitize, included in baseRTC)
    $scope.localStream = $sce.trustAsResourceUrl(window.URL.createObjectURL(audienceRTC.localStream));

    // utilize the audienceRTC factory (injected into the controller) to establish a connection with the presenter.
    // audienceRTC.connect will trigger baseRTC's connectToUser method.
    var openPeerConnection = function(roomName, presenter, username){
      audienceRTC.connect({ roomname: roomName, presenter: presenter }, username);
      $scope.micStatus.command = 'Turn off your mic!';
      $scope.micStatus.power = true;
      $scope.audience[username].speaking = true;
    };

    // audienceRTC.disconnect will trigger baseRTC's disconnectFromUser method.
    var closePeerConnection = function(roomName, presenter, username){
      audienceRTC.disconnect({ roomname: roomName, presenter: presenter}, username);
      $scope.micStatus.command = 'Turn on your mic!';
      $scope.micStatus.power = false;
      $scope.audience[username].speaking = false;
    };

    // based on the mics power attribute, determines whether to open or close a connection.
    $scope.connectionManager = function(){
      if(!$scope.micStatus.power){
        openPeerConnection($scope.roomName, $scope.presenter, $scope.username);
      }else{
        closePeerConnection($scope.roomName, $scope.presenter, $scope.username);
      }
    };

    // if you your handler updates the $scope, you need to call $scope.$apply
    // so angular knows to run a digest.
    // $scope.$apply();
  });
  $scope.toggle = function() {
    console.log("toggle");
  };
  audienceRTC.on('onnegotiationneeded', function(event, remoteUser, pc){
    console.log('onnegotiationneeded -------');
  });
  audienceRTC.on('ondatachannel', function(event, remoteUser, pc){
    console.log('ondatachannel -------');
  });
  audienceRTC.on('onidpassertionerror', function(event, remoteUser, pc){
    console.log('onidpassertionerror -------');
  });
  audienceRTC.on('onidentityresult', function(event, remoteUser, pc){
    console.log('onidentityresult -------');
  });
  audienceRTC.on('onidentityresult', function(event, remoteUser, pc){
    console.log('onidentityresult -------');
  });
  audienceRTC.on('onidpvalidationerror', function(event, remoteUser, pc){
    console.log('onidpvalidationerror -------');
  });
  audienceRTC.on('onpeeridentity', function(event, remoteUser, pc){
    console.log('onpeeridentity -------');
  });
  audienceRTC.on('onsignalingstatechange', function(event, remoteUser, pc){
    console.log('onsignalingstatechange -------');
  });
}]);


// The AudienceController utilizes $rootScope to pass user information between controllers.
// This is not an ideal implementation, and the 'Room' service should be utilized instead.  

app.controller('PresenterControl', ['$scope', '$sce', 'presenterRTC', '$rootScope',
'$firebaseObject', 'Question', function($scope, $sce, presenterRTC, $rootScope, $firebaseObject, Question) {

  var addVideoElem = function (url) {
    console.log('adding video!');
    var vid = document.createElement('video');
    // vid.muted = true;
    vid.autoplay = true;
    vid.src = url;
    document.getElementById('videos').appendChild(vid);
  };

  var roomname = $rootScope.details.roomname.slice();
  var ref = new Firebase('https://popping-inferno-6077.firebaseio.com/');
  var audienceSync = $firebaseObject(ref.child(roomname));
  audienceSync.$bindTo($scope, 'audience').then(function(){
    $scope.drawGraph();
    $scope.pollThumbs();
  });

  $scope.thumbsData = 
    [{src: '../assets/noun_ily-sign_62772.png', value: 0, text: 'Rockin\''},
    {src: '../assets/noun_thumbs-up_61040.png', value: 0, text: 'Up'},
    {src: '../assets/noun_thumb_104590.png',value: 0, text: 'Sideways'},
    {src: '../assets/noun_thumbs-down_61036.png', value: 0, text: 'Down'},
    {src: '../assets/noun_sleep_10297.png', value: 0, text: 'I\'m Bored'}];

  $scope.pollThumbs = function(){
    //reset to 0
    _.each($scope.thumbsData, function(datum){
      datum.value = 0;
    });

    //count
    _.each($scope.audience, function(member){
      if (typeof member === 'object' && member !== null) $scope.thumbsData[member.thumb].value++;
    });

    $scope.updateGraph();
    $scope.timer = window.setTimeout($scope.pollThumbs, 1000);
  };

  $scope.$on('$destroy', function(event){
    window.clearTimeout($scope.timer);
  });

    //DRAW THE GRAPH
  $scope.drawGraph = function() {

    $scope.margin = {top: 20, right: 30, bottom: 30, left: 35};
    $scope.width = window.innerWidth-20 - $scope.margin.left - $scope.margin.right;
    $scope.height = 500 - $scope.margin.top - $scope.margin.bottom;
    $scope.yAxisValue = $scope.audience.size+2;
  
    $scope.d3Graph = d3.select('#graph')
                      .attr("width", $scope.width + $scope.margin.left + $scope.margin.right)
                      .attr("height", $scope.height + $scope.margin.top + $scope.margin.bottom)
                    .append("g")
                      .attr("transform", "translate(" + $scope.margin.left + "," + $scope.margin.top + ")");
  
    $scope.yScale = d3.scale.linear()
                    .domain([0, $scope.yAxisValue])
                    .range([$scope.height, 0]);
  
    $scope.xScale = d3.scale.ordinal()
                      .domain($scope.thumbsData.map(function(thumb) { return thumb.text }))
                      .rangeRoundBands([0, $scope.width], .1);
  
    $scope.xAxis = d3.svg.axis()
                        .scale($scope.xScale)
                        .orient('bottom');
  
    $scope.yAxis = d3.svg.axis()
                        .scale($scope.yScale)
                        .orient('left');
    
    $scope.d3Graph.selectAll('.bar')
      .data($scope.thumbsData, function(d) { return d.text})
    .enter().append('g')
      .attr('class', 'bar')
      .attr('transform', function(d, i) { return 'translate(' + $scope.xScale(d.text) + ',0)'; })
    .append('rect')
        .attr('y', function(d) { return $scope.yScale(d.value) })
        .attr('width', $scope.xScale.rangeBand())
        .attr('height', function(d) { return $scope.height - $scope.yScale(d.value); })
    
    d3.selectAll('.bar')
      .append('text')
            .attr('y', function(d) { return $scope.yScale(d.value) - 15; })
            .attr('x', $scope.xScale.rangeBand() / 2)
            .attr('dy', '.75em')
            .text(function(d) { return d.value; });
  
    // bar.append('svg:image')
    //     .attr('y', function(d) { return $scope.yScale(d.value) - 15; })
    //     .attr('x', barWidth / 2)
    //     .attr('dy', '.75em')
    //     .attr('xlink:href', function(d) {return d.src});
    //     .text(function(d) { return d.value; });
  
  
  
    $scope.d3Graph.append('g')
            .attr('class', 'x-axis axis')
            .attr("transform", "translate(0," + $scope.height + ")")
            .call($scope.xAxis);
  
    $scope.d3Graph.append("g")
            .attr("class", "y axis")
            .call($scope.yAxis);
  };

  //PHEW, that was a lot of graph.

  $scope.updateGraph = function(){

    //if the y scale has changed, redraw the axis

    if ($scope.yAxisValue !== $scope.audience.size + 2) {
      $scope.yAxisValue = $scope.audience.size + 2;

      $scope.yScale = d3.scale.linear()
                      .domain([0, $scope.yAxisValue])
                      .range([$scope.height, 0]);

      $scope.yAxis = d3.svg.axis()
                          .scale($scope.yScale)
                          .orient('left');


      $scope.d3Graph.select('.y.axis').remove();
      
      $scope.d3Graph.append("g")
              .attr("class", "y axis")
              .call($scope.yAxis);
    }

    //redraw the bars and text
    $scope.d3Graph.selectAll('.bar')
        .data($scope.thumbsData, function(d) { return d.text})
        .attr('transform', function(d, i) { return 'translate(' + $scope.xScale(d.text) + ',0)'; })
      .selectAll('rect')
            .data($scope.thumbsData, function(d) { return d.text})
            .transition()
            .attr("y", function(d) { return $scope.yScale(d.value); })
            .attr("height", function(d) { return $scope.height - $scope.yScale(d.value); });
      
    d3.selectAll('.bar')
      .selectAll('text')
            .attr('y', function(d) { return $scope.yScale(d.value) - 15; })
            .attr('x', $scope.xScale.rangeBand() / 2)
            .attr('dy', '.75em')
            .text(function(d) { return d.value; });
  };

  setInterval(function() {
    Question.getQuestions(roomname).then(function(questions) {
      $scope.questions = questions.data;
    });
  }, 1000);


  $scope.connections = [];

  console.log($rootScope.details);
  // only connect once our RTC manager is ready!
  presenterRTC.ready(function () {
    // the first arg here is the room object, the second is the name of the presenter.
    // $scope.createRoom = function(roomName, presenterName){
      // console.log('testing');
      console.log($rootScope.details.roomname);
      console.log($rootScope.details.presenter);
      presenterRTC.connect({ name: $rootScope.details.roomname, presenter: $rootScope.details.presenter}, $rootScope.details.presenter); 
      console.log('testingEnd');
    // };
  });

  presenterRTC.on('onnegotiationneeded', function(event, remoteUser, pc){
    console.log('onnegotiationneeded -------');
  });
  presenterRTC.on('ondatachannel', function(event, remoteUser, pc){
    console.log('ondatachannel -------');
  });
  presenterRTC.on('onidpassertionerror', function(event, remoteUser, pc){
    console.log('onidpassertionerror -------');
  });
  presenterRTC.on('onidentityresult', function(event, remoteUser, pc){
    console.log('onidentityresult -------');
  });
  presenterRTC.on('onidentityresult', function(event, remoteUser, pc){
    console.log('onidentityresult -------');
  });
  presenterRTC.on('onidpvalidationerror', function(event, remoteUser, pc){
    console.log('onidpvalidationerror -------');
  });
  presenterRTC.on('onpeeridentity', function(event, remoteUser, pc){
    console.log('onpeeridentity -------');
  });
  presenterRTC.on('onsignalingstatechange', function(event, remoteUser, pc){
    console.log('onsignalingstatechange -------');
  });
  
  // In order to properly utilize the onremovestream listener, the handshake between the peers must be renegotiated.
  // http://stackoverflow.com/questions/16478486/webrtc-function-removestream-dont-launch-event-onremovestream-javascript
  presenterRTC.on('onremovestream', function(event, remoteUser, pc){
    console.log('we are in here, finally -------');
    console.log(event);
    console.log(remoteUser);
    console.log(pc);
    // for(var i = $scope.connections.length-1; i >= 0; i--) {
    //   if( $scope.connections[i].user === remoteUser) $scope.connections.splice(i,1);
    //   return;
    // }
  });

  presenterRTC.on('oniceconnectionstatechange', function(event, remoteUser, pc){
    console.log('!!!!!!!!!!!!ice connection changed');
    console.log(event);
    console.log(remoteUser);
    console.log(pc);
    // for(var i = $scope.connections.length-1; i >= 0; i--) {
    //   console.log($scope.connections[i]);
    //   if( $scope.connections[i].user === remoteUser) $scope.connections.splice(i,1);
    //   return;
    // }
  });

  // register event handlers for peer connection events. MDN has a description of these events.
  // the remote user and peerconnection object are the last two arguments for any handler
  presenterRTC.on('onaddstream', function (event, remoteUser, pc) {
    // For onaddstream, you need to look in event.stream to get the media stream
    // See audience-1.html for description of trustAsResourceUrl and createObjectURL -- you need both!
    // NOTE: this doesn't yet seem to work when the stream is remote, though I'm pretty sure it should.
    // if you don't go through angular and instead just set the src w/vanillaJS it does work, so things
    // are fine on the RTC side...
    var stream = $sce.trustAsResourceUrl(window.URL.createObjectURL(event.stream));

    //Just testing w/vanillajs here, to make sure the remote stream actually works... angular can be fussy
    addVideoElem(stream);

    var connection = {
      stream: stream,
      user: remoteUser
    };

    $scope.connections.push(connection);

    // must call $scope.$apply so angular knows to run a digest
    $scope.$apply();
  });

  $scope.users = [{'name': 'hey'}, {'name': 'bye'}, {'name': 'sigh'}];
  $scope.mute = function(speaker) {
    console.log('mute function responds', speaker);
  };
}]);

app.config(['baseRTCProvider', function(baseRTCProvider) {
  console.log('hey! in the config');
  
  baseRTCProvider.setSignalServer('ws://127.0.0.1:3434');
  // baseRTCProvider.setSignalServer('ws://localhost:3434'); //normally must be set up by app
  // baseRTCProvider.setSignalServer('ws://307a1d89.ngrok.com'); //normally must be set up by app

  baseRTCProvider.setPeerConnectionConfig({
    'iceServers': [
      {'url': 'stun:stun.services.mozilla.com'}, 
      {'url': 'stun:stun.l.google.com:19302'}
    ]
  });
}]);
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
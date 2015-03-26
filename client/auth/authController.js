micControllers.controller('AuthControl', ['$scope', 'Auth', function($scope, Auth) {

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
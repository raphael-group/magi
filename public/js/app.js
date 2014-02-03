'use strict';

// Declare app level module which depends on controllers, services, and directives

angular.module('cgat', [
	'ngRoute',
	'cgat.controllers',
	'cgat.services',
	'cgat.directives', 
	'HashBangURLs'
]).
config(function ($routeProvider) {
	$routeProvider.
		when('/', {
			templateUrl: 'partials/main-view',
			controller: 'ViewCtrl',
			resolve: {
				styling: function(styling){
					return styling.promise;
				}
			}
		}).
		otherwise({
			redirectTo: '/'
		});

});

// Configure HashBang URLs
angular.module('HashBangURLs', []).config(['$locationProvider', function($location) {
	$location.html5Mode(false).hashPrefix('!');
}]);

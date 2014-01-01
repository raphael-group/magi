'use strict';

/* Services */
angular.module('gd3.services', [])
	.value('version', '1.0')
	.service('styling', function($http) {
		var styles = null;

		var promise = $http.get('js/gd3/style.json').success(function(json) {
			styles = json;
		});

		return {
			promise: promise,
			data: function () {
			  return styles;
		  }
		};
	});
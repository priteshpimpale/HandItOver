/* jshint browser: true, jquery: true, curly: true, eqeqeq: true, forin: true, immed: true, indent: 4, latedef: true, newcap: true, nonew: true, quotmark: double, undef: true, unused: true, strict: true, trailing: true*/
/* globals io,angular */
"use strict";

function SignUpDialogController($scope, $mdDialog) {
    $scope.signup = {};
    $scope.signup.status = "info";
    
    $scope.user = {
        name : "",
        phone : "",
        email : "",
        address : "",
        username : "",
        password : "",
        passwordconf : ""
    };
    
    $scope.callsignup = function(){
        $mdDialog.hide($scope.user);
    };

    $scope.hide = function () {
        $mdDialog.hide();
    };
    $scope.cancel = function () {
        $mdDialog.cancel();
    };
    $scope.next = function (answer) {
        $scope.signup.status = answer;
        //$mdDialog.hide(answer);
    };
}

function SignInDialogController($scope,$http, $mdDialog) {    
    $scope.user = {
        username : "",
        password : ""
    };
    $scope.loginFailed = false;
    $scope.callsignin = function(){
        $http({
            method: "POST",
            url: "/api/userlogin",
            data: $scope.user
        }).then(function successCallback(response) {
            console.log(response.data);
            if(response.data.username){
                $scope.loginFailed = false;
                $scope.user = response.data;
                $mdDialog.hide(response.data);
            }else{
                window.alert(response.data.result);
                $scope.loginFailed = true;
                $mdToast.show(
                    $mdToast.simple()
                        .textContent("Sorry the password doesn't match.")
                        .position("top right")
                        .hideDelay(3000)
                        .parent("md-content.md-padding")
                );
            }
        }, function errorCallback(response) {
            console.error(response);
        });
    };
    $scope.hide = function () {
        $mdDialog.hide();
    };
    $scope.cancel = function () {
        $mdDialog.cancel();
    };
}

angular.module("HandItOver",["ngMaterial","ngRoute","ngMessages","lfNgMdFileInput"])
.controller("mainController",["$scope","$http","$location","$mdDialog", "$mdMedia","$mdToast","socket",function ($scope,$http,$location,$mdDialog, $mdMedia,$mdToast,socket) {
    /**************   Sign-up Dialog   **************** */
    $scope.customFullscreen = $mdMedia("xs") || $mdMedia("sm");
    $scope.user = { name : "" };
    
    /************************************************* */
    
    function setCookie(cname, cvalue, exmins) {
        var d = new Date();
        d.setTime(d.getTime() + (exmins*60*1000));
        var expires = "expires="+d.toUTCString();
        document.cookie = cname + "=" + cvalue + "; " + expires;
    }

    function getCookie(cname) {
        var name = cname + "=";
        var ca = document.cookie.split(";");
        for(var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === " ") {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }
    /********************************************** */
    var usernameCookie = getCookie("username");
    if(usernameCookie !== ""){
        $http({
            method: "POST",
            url: "/api/userlogin",
            data: { "usernameCookie": usernameCookie }
        }).then(function successCallback(response) {
            console.log(response.data);
            if(response.data.username){
                $scope.user = response.data;
            }else{
                window.alert(response.data);
                setCookie("username", "", 0);
            }
            
            angular.forEach($scope.offers,function (item) {
                if($scope.user.favorites && $scope.user.favorites.indexOf(item._id) !== -1){
                    item.isFavorite = "red";
                }
            });
            
            
        }, function errorCallback(response) {
            console.error(response);
        });
    }
    
    $scope.showSignUpDialog = function (ev) {
        var useFullScreen = ($mdMedia("sm") || $mdMedia("xs")) && $scope.customFullscreen;
        $mdDialog.show({
            controller: SignUpDialogController,
            templateUrl: "Client/templates/signUpDialog.html",
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: true,
            fullscreen: useFullScreen
        })
        .then(function (user) {
            $http({
                method: "POST",
                url: "/api/user",
                data : user,
                }).then(function successCallback(response) {
                    console.log(response.data);
                    $scope.user = response.data;
                    setCookie("username", $scope.user._id, 30);
                }, function errorCallback(response) {
                    //window.alert(response);
                    console.error(response);
            });
            //$scope.status = "You said the information was "" + answer + "".";
        }, function () {
            //$scope.status = "You cancelled the dialog.";
        });
        
        $scope.$watch(function () {
            return $mdMedia("xs") || $mdMedia("sm");
        }, function (wantsFullScreen) {
            $scope.customFullscreen = (wantsFullScreen === true);
        });
    };
    
    $scope.showSignInDialog = function (ev) {
        var useFullScreen = ($mdMedia("sm") || $mdMedia("xs")) && $scope.customFullscreen;
        $mdDialog.show({
            controller: SignInDialogController,
            templateUrl: "Client/templates/signInDialog.html",
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: true,
            fullscreen: useFullScreen
        })
        .then(function (user) {
            $scope.user = user;
            setCookie("username", $scope.user._id, 30);
            console.log($scope.user);
            $mdToast.show(
                $mdToast.simple()
                    .textContent("Hurray!! Enjoy Shopping.")
                    .position( "top right")
                    .hideDelay(3000)
                    .parent("md-content.md-padding")
            );
            
            angular.forEach($scope.offers,function (item) {
                if($scope.user.favorites && $scope.user.favorites.indexOf(item._id) !== -1){
                    item.isFavorite = "red";
                }
            });
            /************************** */
            socket.initiate();
            socket.emit("startSession", "Hey What's up!");
            
            
        }, function () {
            //$scope.status = "You cancelled the dialog.";
        });
        
        $scope.$watch(function () {
            return $mdMedia("xs") || $mdMedia("sm");
        }, function (wantsFullScreen) {
            $scope.customFullscreen = (wantsFullScreen === true);
        });
    };
    
    var originatorEv;
    $scope.openUserMenu = function($mdOpenMenu, ev) {
      originatorEv = ev;
      $mdOpenMenu(ev);
    };
    
    $scope.logout = function(){
        $http({
            method: "GET",
            url: "/api/logout",
            }).then(function successCallback(response) {
                $scope.user = { name : "" };
                console.log(response);
                setCookie("username", "", 0);
                $mdToast.show(
                    $mdToast.simple()
                        .textContent("Bye bye.. visit again")
                        .position( "top right")
                        .hideDelay(3000)
                        .parent("md-content.md-padding")
                );
            }, function errorCallback(response) {
                //window.alert(response);
                console.error(response);
        });
    };
        /**************   Offers Page   ****************** */
    $scope.offers = [];
    $scope.categories = [];
    $http({
        method: "GET",
        url: "/api/offers",
        }).then(function successCallback(response) {
            $scope.categories = [];
            angular.forEach(response.data,function (item) {
                var offer = item.doc;
                //offer.imagePath = "iphone.png";
                if($scope.user.favorites && $scope.user.favorites.indexOf(offer._id) !== -1){
                    offer.isFavorite = "red";
                }else{
                    offer.isFavorite = "";
                }
                if($scope.categories.indexOf(offer.category) === -1){
                    $scope.categories.push(offer.category);
                }
                offer.makeofferDiv = false;
                $scope.offers.push(offer);
            });
            console.log($scope.offers);
            
        }, function errorCallback(response) {
            //window.alert(response);
            console.error(response);
    });
    
    $scope.details = function(offer){
        offer.makeofferDiv = true;
    };
    $scope.myOffer = 0;
    $scope.makeOffer = function(offer){
        //var newOffer = { offerId: offer._id, offerRevId: offer._rev, myOffer: $scope.myOffer, user: $scope.user.username };
        if($scope.user.username === undefined){
            $mdToast.show(
                $mdToast.simple()
                    .textContent("Let users know who are you? \n Please Login to start shopping")
                    .position("top right")
                    .hideDelay(3000)
                    .parent("md-content.md-padding")
            );
        }else{
            var newOffer = offer;
            if(!newOffer.offers){
                newOffer.offers = [];
            }
            console.log(offer.myOffer);
            var currentDate = new Date();
            newOffer.offers.push({offeredPrice: offer.myOffer, user: $scope.user.username, date: currentDate });
            delete newOffer.isFavorite;
            delete newOffer.makeofferDiv;
            delete newOffer.myOffer;
            var offerId = offer._id;
            $http({
                method: "PATCH",
                url: "/api/offer",
                data : newOffer,
                }).then(function successCallback(response) {
                    console.log(response.data);
                    angular.forEach($scope.offers,function(of){
                        if(of._id === offerId){
                            of = response.data;
                        }  
                    });
                    $mdToast.show(
                        $mdToast.simple()
                            .textContent("Your price offered to user")
                            .position("top right")
                            .hideDelay(3000)
                            .parent("md-content.md-padding")
                    );
                    
                }, function errorCallback(response) {
                    //window.alert(response);
                    console.error(response);
            });
        }
    };
    
    function updateUser(){
        $http({
            method: "PATCH",
            url: "/api/user",
            data : $scope.user,
            }).then(function successCallback(response) {
                console.log(response.data);
                $scope.user = response.data;
                setCookie("username", $scope.user._id, 30);
            }, function errorCallback(response) {
                //window.alert(response);
                console.error(response);
        });
    }
    
    $scope.markFavorite =function (offer) {
        if(offer.isFavorite === undefined || offer.isFavorite === ""){
            offer.isFavorite = "red";
            if(!$scope.user.favorites){
                $scope.user.favorites = [];
            }
            if($scope.user.favorites.indexOf(offer._id) === -1){
                $scope.user.favorites.push(offer._id);
                updateUser();
            }
        }else{
            offer.isFavorite = "";
            $scope.user.favorites.splice($scope.user.favorites.indexOf(offer._id), 1);
            updateUser();
        }
    };
    
    $scope.markSold = function(offer){
        var newOffer = offer;
        newOffer.isSold = true;
        delete newOffer.isFavorite;
        delete newOffer.makeofferDiv;
        delete newOffer.myOffer;
        var offerId = offer._id;
        $http({
            method: "PATCH",
            url: "/api/offer",
            data : newOffer,
            }).then(function successCallback(response) {
                console.log(response.data);
                angular.forEach($scope.offers,function(of){
                    if(of._id === offerId){
                        of = response.data;
                    }  
                });
                $mdToast.show(
                    $mdToast.simple()
                        .textContent("Item marked as sold")
                        .position("top right")
                        .hideDelay(3000)
                        .parent("md-content.md-padding")
                );
                
            }, function errorCallback(response) {
                //window.alert(response);
                console.error(response);
        });
    };
    
    
    /*********   Themes   ************* */
    $scope.themes = ["default","purple","red"];
    $scope.dynamicTheme = "default";
    $scope.getSelectedText = function () {
        if ($scope.selectedItem !== undefined) {
            return $scope.selectedItem;
        } else {
            return "Please select a theme";
        }
    };
    /**********   New Offer   ********** */
    $scope.loadNewOffer =function () {
        $location.path("/newoffer");
    };
    
    
    $scope.newOfferData = {};
    $scope.newOfferData.categories = ["appliances","auto parts","bicycle parts","bicycles","books & magazines","cell phones","clothing & accessories","computer & computer parts","free stuff","sports accessories"];
    
    $scope.newOffer = {
        category : "",
        title : "",
        price : "",
        description : "",
        user : ""
    };
    $scope.breadcrumb = "Category";
    $scope.changeBreadcrumb = function(param) {
        $scope.breadcrumb = param;
    };
    
    $scope.selectedFile = {};
    $scope.$watch("files.length",function(newVal,oldVal){
        console.log(newVal,oldVal);
        console.log("Files: " , $scope.files);
        $scope.selectedFile = $scope.files;
    });
    
    // $scope.$watch("files1.length",function(newVal,oldVal){
    //     console.log("Files1: " , $scope.files1);
    //     $scope.selectedFile = $scope.files1;
    // });
        
    // $scope.initializeUpload = function(){
    //     $scope.$watch("files.length",function(newVal,oldVal){
    //         console.log("Files(i): " , $scope.files);
    //         $scope.selectedFile = $scope.files;
    //     });
    // };
    
    $scope.AddOffer = function() {
        var fData = new FormData(); 
        $scope.newOffer.user = $scope.user.username;
        angular.forEach($scope.selectedFile,function(obj){
            fData.append("files", obj.lfFile);
        });
        console.log($scope.newOffer);
        fData.append("data" , JSON.stringify($scope.newOffer));
        
        console.log("fData: ", fData.getAll("data"));
        console.log("fData: ", fData.getAll("files"));
        $http({
            method: "POST",
            url: "/api/offer",
            transformRequest: angular.identity,
            headers: {"Content-Type": undefined },
            //headers: {"Content-Type": "multipart/form-data"},
            
            //data : $scope.newOffer,
            data : fData,
            }).then(function successCallback(response) {
                $scope.offers.push(response.data);
                console.log(response.data);
                $mdToast.show(
                    $mdToast.simple()
                        .textContent("Offer added successfully")
                        .position( "top right")
                        .hideDelay(3000)
                        .parent("md-content.md-padding")
                );
                $location.path("/");
            }, function errorCallback(response) {
                //window.alert(response);
                console.error(response);
        });
    };
    $scope.sahaj = "main scope";
    
}])
// .controller("fileupload",["$scope",function($scope){
//     $scope.sahaj = "fileUpload scope";
//     $scope.$watch("files1.length",function(newVal,oldVal){
//         console.log("Files: " , $scope.files);
//         $scope.selectedFile = $scope.files;
//     });
// }])
.config(function ($mdThemingProvider,$routeProvider,$compileProvider) {
    $compileProvider.debugInfoEnabled(false);
    $mdThemingProvider.theme("default")
        .primaryPalette("blue")
        .accentPalette("orange");
    $mdThemingProvider.theme("purple")
        .primaryPalette("purple");
    $mdThemingProvider.theme("red")
        .primaryPalette("red");
            
    $mdThemingProvider.setDefaultTheme("default");
    $mdThemingProvider.alwaysWatchTheme(true);
    
    /******************************** */
    $routeProvider
    .when("/", {
        templateUrl:"Client/templates/offers.html",
        //controller: "mainController"
    })
    .when("/offer/:id", {
        templateUrl:"Client/templates/detail.html",
    })
    .when("/newoffer", {
        templateUrl:"Client/templates/newOffer.html",
        //controller: "fileupload"
        
    })
    .otherwise({
        redirectTo:"/"
    });     
})
.directive("matchpassword",[function(){
    return{
        restrict : "A",
        require : "ngModel",
        link : function(scope, element, attrs, ngModel){
            console.log("attr :", attrs);
            function setAsPasswordMatch(bool) {
                ngModel.$setValidity("passwordmatch", !bool);
            }
            function setAsNoPasswordMatch(bool) {
                ngModel.$setValidity("nopasswordmatch", !bool);
            }
            
            ngModel.$parsers.push(function(value) {
                var realpassword = attrs.matchpassword;
                console.log("value :", value);
                if(value === realpassword){
                    setAsNoPasswordMatch(false);
                    setAsPasswordMatch(true);
                }else {
                    setAsNoPasswordMatch(true);
                    setAsPasswordMatch(false);
                }
                return value;   
            });
        }
    };
}])
.service("socket", ["$location", "$timeout",
    function ($location, $timeout) {
        this.initiate = function () {
            // this.socket = io();
            this.socket = io.connect("http://localhost:5000");
        };

        this.on = function (eventName, callback) {
            if (this.socket) {
                this.socket.on(eventName, function (data) {
                    $timeout(function () {
                        callback(data);
                    });
                });
            }
        };

        this.emit = function (eventName, data) {
            if (this.socket) {
                this.socket.emit(eventName, data);
            }
        };

        this.removeListener = function (eventName) {
            if (this.socket) {
                this.socket.removeListener(eventName);
            }
        };
    }
]);


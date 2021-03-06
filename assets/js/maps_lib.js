  /*!
 * Searchable Map Template with Google Fusion Tables
 * http://derekeder.com/searchable_map_template/
 *
 * Copyright 2012, Derek Eder
 * Licensed under the MIT license.
 * https://github.com/derekeder/FusionTable-Map-Template/wiki/License
 *
 * Date: 12/10/2012
 *
 */

// Enable the visual refresh
google.maps.visualRefresh = true;

var MapsLib = MapsLib || {};
var MapsLib = {

  //Setup section - put your Fusion Table details here
  //Using the v1 Fusion Tables API. See https://developers.google.com/fusiontables/docs/v1/migration_guide for more info

  //the encrypted Table ID of your Fusion Table (found under File => About)
  //NOTE: numeric IDs will be deprecated soon
  fusionTableId:      "1b2Zp4n5cCOxn8kxrvfeEjlZHyoP3WRqoQ4mJDlPH",

  //*New Fusion Tables Requirement* API key. found at https://code.google.com/apis/console/
  //*Important* this key is for demonstration purposes. please register your own.
  googleApiKey:       "AIzaSyAyIbn1zj3mSJXwiTZFUdnvKXdw8OwST9g",

  //name of the location column in your Fusion Table.
  //NOTE: if your location column name has spaces in it, surround it with single quotes
  //example: locationColumn:     "'my location'",
  locationColumn:     "lat",

  map_centroid:       new google.maps.LatLng(41.8781136, -87.66677856445312), //center that your map defaults to
  locationScope:      "US",      //geographical area appended to all address searches
  recordName:         "chapter",       //for showing number of results
  recordNamePlural:   "chapters",

  searchRadius:       40250,            //in meters ~ 1/2 mile
  defaultZoom:        12,             //zoom level when map is loaded (bigger is more zoomed in)
  addrMarkerImage:    'images/blue-pushpin.png',
  currentPinpoint:    null,

  initialize: function() {
    $( "#result_count" ).html("");
	$("#text_search").val("");
	
    geocoder = new google.maps.Geocoder();
    var myOptions = {
      zoom: MapsLib.defaultZoom,
      center: MapsLib.map_centroid,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map($("#map_canvas")[0],myOptions);

    // maintains map centerpoint for responsive design
    google.maps.event.addDomListener(map, 'idle', function() {
        MapsLib.calculateCenter();
    });

    google.maps.event.addDomListener(window, 'resize', function() {
        map.setCenter(MapsLib.map_centroid);
    });

    MapsLib.searchrecords = null;

    //reset filters
    $("#search_address").val(MapsLib.convertToPlainString($.address.parameter('address')));
    var loadRadius = MapsLib.convertToPlainString($.address.parameter('radius'));
    if (loadRadius != "") $("#search_radius").val(loadRadius);
    else $("#search_radius").val(MapsLib.searchRadius);
    $(":checkbox").prop("checked", "checked");
    $("#result_box").hide();
    
    //-----custom initializers-------
    
    //-----end of custom initializers-------

    //run the default search
    MapsLib.doSearch();
  },

  doSearch: function(location) {
    MapsLib.clearSearch();
    var address = $("#search_address").val();
    MapsLib.searchRadius = $("#search_radius").val();

    var whereClause = MapsLib.locationColumn + " not equal to ''";
 
    //-----custom filters-------
	
	var text_search = $("#text_search").val().replace("'", "\\'");
	if (text_search != '')
		whereClause += " AND 'name' contains ignoring case '" + text_search + "'";
		
	//var type_column = "Products";
	//var tempWhereClause = [];
	//if ( $("#cbType1").is(':checked')) tempWhereClause.push("FiberFloor");
	//if ( $("#cbType2").is(':checked')) tempWhereClause.push("Vinyl");
	//if ( $("#cbType3").is(':checked')) tempWhereClause.push("Laminate");
	//if ( $("#cbType4").is(':checked')) tempWhereClause.push("Luxury");
	
	//whereClause += " AND " + type_column + " IN ('" + tempWhereClause.join("','") + "')";
	//console.log(" whereClause: " + whereClause);

if ( $("#select_type").val() != "")
      whereClause += " AND 'standard' = '" + $("#select_type").val() + "'";
	
    //-------end of custom filters--------

    if (address != "") {
      if (address.toLowerCase().indexOf(MapsLib.locationScope) == -1)
        address = address + " " + MapsLib.locationScope;

      geocoder.geocode( { 'address': address}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          MapsLib.currentPinpoint = results[0].geometry.location;

          $.address.parameter('address', encodeURIComponent(address));
          $.address.parameter('radius', encodeURIComponent(MapsLib.searchRadius));
          map.setCenter(MapsLib.currentPinpoint);
          
          // set zoom level based on search radius
          if (MapsLib.searchRadius      >= 1610000) map.setZoom(04); // 1,000 miles
          else if (MapsLib.searchRadius >= 805000)  map.setZoom(05); // 500 miles
          else if (MapsLib.searchRadius >= 402500)  map.setZoom(06); // 250 miles
          else if (MapsLib.searchRadius >= 161000)  map.setZoom(07); // 100 miles
          else if (MapsLib.searchRadius >= 80500)   map.setZoom(08); // 50 miles
          else if (MapsLib.searchRadius >= 40250)   map.setZoom(09); // 25 miles
          else if (MapsLib.searchRadius >= 16100)   map.setZoom(11); // 10 miles
          else if (MapsLib.searchRadius >= 8050)    map.setZoom(12); // 5 miles
          else if (MapsLib.searchRadius >= 3220)    map.setZoom(13); // 2 miles
          else if (MapsLib.searchRadius >= 1610)    map.setZoom(14); // 1 mile
          else if (MapsLib.searchRadius >= 805)     map.setZoom(15); // 1/2 mile
          else if (MapsLib.searchRadius >= 400)     map.setZoom(16); // 1/4 mile
          else                                      map.setZoom(17);

          MapsLib.addrMarker = new google.maps.Marker({
            position: MapsLib.currentPinpoint,
            map: map,
            icon: MapsLib.addrMarkerImage,
            animation: google.maps.Animation.DROP,
            title:address
          });

          whereClause += " AND ST_INTERSECTS(" + MapsLib.locationColumn + ", CIRCLE(LATLNG" + MapsLib.currentPinpoint.toString() + "," + MapsLib.searchRadius + "))";

          MapsLib.drawSearchRadiusCircle(MapsLib.currentPinpoint);
          MapsLib.submitSearch(whereClause, map, MapsLib.currentPinpoint);
        }
        else {
          alert("We could not find your address: " + status);
        }
      });
    }
    else { //search without geocoding callback
      MapsLib.submitSearch(whereClause, map);
    }
  },

  submitSearch: function(whereClause, map, location) {
    //get using all filters
    //NOTE: styleId and templateId are recently added attributes to load custom marker styles and info windows
    //you can find your Ids inside the link generated by the 'Publish' option in Fusion Tables
    //for more details, see https://developers.google.com/fusiontables/docs/v1/using#WorkingStyles

    MapsLib.searchrecords = new google.maps.FusionTablesLayer({
      query: {
        from:   MapsLib.fusionTableId,
        select: MapsLib.locationColumn,
        where:  whereClause
      },
      styleId: 2,
      templateId: 2
    });
    MapsLib.searchrecords.setMap(map);
    MapsLib.getCount(whereClause);
	MapsLib.getList(whereClause);
  },

  clearSearch: function() {
    if (MapsLib.searchrecords != null)
      MapsLib.searchrecords.setMap(null);
    if (MapsLib.addrMarker != null)
      MapsLib.addrMarker.setMap(null);
    if (MapsLib.searchRadiusCircle != null)
      MapsLib.searchRadiusCircle.setMap(null);
  },

  findMe: function() {
    // Try W3C Geolocation (Preferred)
    var foundLocation;

    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        foundLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        MapsLib.addrFromLatLng(foundLocation);
      }, null);
    }
    else {
      alert("Sorry, we could not find your location.");
    }
  },

  addrFromLatLng: function(latLngPoint) {
    geocoder.geocode({'latLng': latLngPoint}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $('#search_address').val(results[1].formatted_address);
          $('.hint').focus();
          MapsLib.doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  },

  drawSearchRadiusCircle: function(point) {
      var circleOptions = {
        strokeColor: "#4b58a6",
        strokeOpacity: 0.3,
        strokeWeight: 1,
        fillColor: "#4b58a6",
        fillOpacity: 0.05,
        map: map,
        center: point,
        clickable: false,
        zIndex: -1,
        radius: parseInt(MapsLib.searchRadius)
      };
      MapsLib.searchRadiusCircle = new google.maps.Circle(circleOptions);
  },

  query: function(selectColumns, whereClause, groupBy, orderBy, callback) {
    var queryStr = [];
    queryStr.push("SELECT " + selectColumns);
    queryStr.push(" FROM " + MapsLib.fusionTableId);
    
    // where, group and order clauses are optional
    if (whereClause != "" && whereClause != null)
      queryStr.push(" WHERE " + whereClause);

    if (groupBy != "" && groupBy != null)
      queryStr.push(" GROUP BY " + groupBy);

     if (orderBy != "" && orderBy != null)
      queryStr.push(" ORDER BY " + orderBy);

    var sql = encodeURIComponent(queryStr.join(" "));
    $.ajax({url: "https://www.googleapis.com/fusiontables/v1/query?sql="+sql+"&callback="+callback+"&key="+MapsLib.googleApiKey, dataType: "jsonp"});
  },

  handleError: function(json) {
    if (json["error"] != undefined) {
      var error = json["error"]["errors"]
      console.log("Error in Fusion Table call!");
      for (var row in error) {
        console.log(" Domain: " + error[row]["domain"]);
        console.log(" Reason: " + error[row]["reason"]);
        console.log(" Message: " + error[row]["message"]);
      }
    }
  },

  getCount: function(whereClause) {
    var selectColumns = "Count()";
    MapsLib.query(selectColumns, whereClause, "", "", "MapsLib.displaySearchCount");
  },

  displaySearchCount: function(json) {
    MapsLib.handleError(json);

    var numRows = 0;
    if (json["rows"] != null)
      numRows = json["rows"][0];

    var name = MapsLib.recordNamePlural;
    if (numRows == 1)
    name = MapsLib.recordName;
    if (numRows < 50) {
      $( "#result_box" ).fadeOut(function() {
          $( "#result_count" ).html(MapsLib.addCommas(numRows) + " " + name + " found");
        });
      $( "#result_box" ).fadeIn(); }
    else {
      $( "#result_box" ).fadeOut(function() {
          $( "#result_count" ).html("Enter a zip code or a chapter name to narrow your search");
        });
      $( "#result_box" ).fadeIn();
    }
  },

  addCommas: function(nStr) {
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
  },

  // maintains map centerpoint for responsive design
  calculateCenter: function() {
    center = map.getCenter();
  },

  //converts a slug or query string in to readable text
  convertToPlainString: function(text) {
    if (text == undefined) return '';
  	return decodeURIComponent(text);
  },
  
  //-----custom functions-------
  // NOTE: if you add custom functions, make sure to append each one with a comma, except for the last one.
  // This also applies to the convertToPlainString function above
  getList: function(whereClause) {
	  var selectColumns = "name, city, country, phone, postalcode, address, state, link, email, hours, facebook, twitter, premiere, appointment";
	  MapsLib.query(selectColumns, whereClause, "", "", "MapsLib.displayList");
	},

	displayList: function(json) {
	  MapsLib.handleError(json);
	  var data = json["rows"];
	  var template = "";

	  var results = $("#results_list");
	  results.hide().empty(); //hide the existing list and empty it out first

	  if (data == null) {
		//clear results list
		results.append("<li><span class='lead'>No results found</span></li>");
	  }
	  else {
		for (var row in data) {
      template = "";

      if(data[row][13]) {
        template += "<div class='row-fluid item-list appointmentonly'>";
      }

      if(data[row][12]) {
        template += "<div class='row-fluid item-list premiere'>";
      }

		  template += "<div class='span12'>\
				<strong>" + data[row][0] + "</strong>\
				<br />\
				" + data[row][9] + "\
        <br />\
        " + data[row][5] + "\
				<br />\
				" + data[row][1] + ", " + data[row][6] + " " + data[row][4] + "\
				<br /><a href=\"tel:" + data[row][3] + "\" class='chapter-phone'><i class=\"fa fa-phone\" aria-hidden=\"true\"></i>" + data[row][3] + "</a>\
        <br /><a href=\"mailto:" + data[row][8] + "\" class='chapter-email'><i class=\"fa fa-envelope\" aria-hidden=\"true\"></i>" + data[row][8] + "</a><br />\
				<a href=\"https://www.google.com/maps/place/" + data[row][5] + ", " + data[row][1] + ", " + data[row][6] + " " + data[row][4] + "\" + onclick='return !window.open(this.href);' class='chapter-map'><i class=\"fa fa-map-marker\" aria-hidden=\"true\"></i>Map This</a>";
			 
       // Add Facebook link if exists
       if(data[row][10]) {
        template += "<a href=\"" + data[row][10] + "\" class='chapter-facebook'><i class=\"fa fa-facebook-official\" aria-hidden=\"true\"></i>Facebook</a>";
       }

       // Add Twitter link if exists
       if(data[row][11]) {
        template += "<a href=\"" + data[row][11] + "\" class='chapter-twitter'><i class=\"fa fa-twitter\" aria-hidden=\"true\"></i>Twitter</a>";
       }

       // Add Appt Only
       if(data[row][13]) {
        template += "<br /><small>This chapter is appointment only. Please call to schedule an appointment time.</small>";
       }

       template += "<br /><br /></div></div>";

		  results.append(template);
		}
	  }
	  results.fadeIn();
	}


  //-----end of custom functions-------
}

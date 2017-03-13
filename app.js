var App;
(function (App) {
    var charts = {};
    var dataPoints = null;
    var dataCrossFilters = null;

    var numberFormat = d3.format(".2f");
    var parseDate = d3.time.format("%m/%d/%Y %H:%M").parse;     // 1/2/09 6:17

    var geoColors = d3.scale.quantize().domain([0,10])
        .range(["#D0D0D0", "#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF","#36A2FF", "#1E96FF", "#0089FF", "#0061B5"]);
    
    var geoProjections = {
        World : d3.geo.mercator().scale(95).translate([300, 300]),
        Europe : d3.geo.mercator().scale(550).translate([120, 720])
    };

    // Modifies the label of a pie chart
    var formatLabelPie = function (chart) {
        var labels = chart.selectAll("text");
        
        labels.each(function(d) {
            var el = d3.select(this);
            var lab = el.text();
            var words = lab.split(' ');
            el.text('');
            el.attr("transform", "scale(1.4) " + el.attr("transform"));
            
            for (var i = 0; i < words.length; i++) {
                var tspan = el.append('tspan').text(words[i]);
                if (i > 0)
                    tspan.attr('x', 0).attr('dy', '11');
            }
        });
    };
    
    // DataPoint is an Object
    function DataPoint(row) {
        this.transactionDate = parseDate(row.Transaction_date);
        this.product = row.Product.trim();
        this.price = parseInt(row.Price);
        this.paymentType = row.Payment_Type.trim();
        this.name = row.Name.trim();
        this.city = row.City.trim();
        this.state = row.State.trim();
        this.country = row.Country.trim();
        this.accountCreated = parseDate(row.Account_Created);
        this.lastLogin = parseDate(row.Last_Login);
        this.latitude = parseFloat(row.Latitude);
        this.longitude = parseFloat(row.Longitude);
    }
    
    // DataCrossFilters is an Object
    function DataCrossFilters(dataPoints) {
        this.pointsFilter = crossfilter(dataPoints);
        
        this.dateDim = this.pointsFilter.dimension(function(d) { return d.transactionDate; });
        this.dateMin = this.dateDim.bottom(1)[0].transactionDate;
        this.dateMax = this.dateDim.top(1)[0].transactionDate;
        this.dateSales = this.dateDim.group();

        this.productDim = this.pointsFilter.dimension(function(d) { return d.product; });
        this.productSales = this.productDim.group();
        this.paymentDim = this.pointsFilter.dimension(function(d) { return d.paymentType; });
        this.paymentSales = this.paymentDim.group();
        this.countryDim = this.pointsFilter.dimension(function(d) { return d.country; });
        this.countrySales = this.countryDim.group();
        this.stateDim = this.pointsFilter.dimension(function(d) { return d.state; });
        this.stateSales = this.stateDim.group();

        this.allPoints = this.pointsFilter.groupAll();
    }
    
    function setSalesPieChart(name, dimension, grouping) {
        return dc.pieChart("#" + name)
            .width(300)
            .height(300)
            .radius(140)
            .dimension(dimension)
            .group(grouping)
            .title(function (d) { 
                return "Sales by " + d.data.key + "\n" + 
                    Math.floor(d.value / dataCrossFilters.allPoints.value() * 100) + '% (' + d.value + " Total)";
            })            
            .renderTitle(true)
            .label(function (d) {
                return d.data.key + ' ' + Math.floor(d.value / dataCrossFilters.allPoints.value() * 100) + '%';
            })
            .renderlet(formatLabelPie);            
    }
    
    function setDataPoints(rows) {
        dataPoints = d3.csv.parse(rows, function(row) {
            return new DataPoint(row);
        });
        
        dataCrossFilters = new DataCrossFilters(dataPoints);

        charts.chartProduct = setSalesPieChart("chartProduct", dataCrossFilters.productDim, dataCrossFilters.productSales);
        charts.chartPayment = setSalesPieChart("chartPayment", dataCrossFilters.paymentDim, dataCrossFilters.paymentSales);

        charts.chartState = dc.geoChoroplethChart("#chartState");
        charts.chartState
            .width(600)
            .height(400)
            .projection(d3.geo.albersUsa().scale(800).translate([300, 200]))
            .dimension(dataCrossFilters.stateDim)
            .group(dataCrossFilters.stateSales)
            .colorDomain([0, 200])
            .colorCalculator(function (d) {
                return geoColors(d || 0).toString(); 
            })
            .overlayGeoJson(GeoData.US.Boundary.features, "state", function (d) {
                return d.properties.name;
            })
            .title(function (d) {
                return GeoData.US.Label[d.key] + " (" + d.key + ")\nTotal Sales: " + (d.value ? d.value : 0);
            });
            
        charts.chartCountry = dc.geoChoroplethChart("#chartCountry");
        charts.chartCountry
            .width(600)
            .height(450)
            .projection(geoProjections.World)
            .dimension(dataCrossFilters.countryDim)
            .group(dataCrossFilters.countrySales)
            .colorDomain([0, 200])
            .colorCalculator(function (d) {
                return geoColors(d || 0).toString(); 
            })
            .overlayGeoJson(GeoData.Country.Boundary.features, "country", function (d) {
                return d.properties.name;
            })
            .title(function (d) {
                return d.key + "\nTotal Sales: " + (d.value ? d.value : 0);
            });

        dc.renderAll();
         
        console.log("App.setDataPoints: " + dataPoints.length);
    }
    
    function setWorldProjection(proj) {
        charts.chartCountry.projection(geoProjections[proj]);
        dc.renderAll();
    }      
   
    App.charts = charts;
    App.dataPoints = dataPoints;
    App.dataCrossFilters = dataCrossFilters;
    App.setDataPoints = setDataPoints;
    App.setWorldProjection = setWorldProjection;
})(App || (App = {}));


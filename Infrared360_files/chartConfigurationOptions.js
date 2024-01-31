var defaultChartOptions = 
{
	maintainAspectRatio:true, // Need to set to 'true' to keep Chart within the screen size
	title:{
      display:true,
      text:""
   },
   tooltips:{
      intersect:false,
      mode:"index"
   },
   hover:{
      intersect:false,
      mode:"nearest"
   },
   legend:{
      //position:"right"
	   display: false
   },
   elements:{
      rectangle:{
         borderWidth:2
      }
   },
   chartArea:{
      backgroundColor:""
   },
   aspectRatio:2,
   responsive:true,
   spanGaps:true  
};

var defaultLineChartOptions =
{
	 scales:{
	      xAxes:[
	         {
	            ticks:{
	               display:true,
	               beginAtZero:true,
	               reverse:false,
	               min:0,
	               suggestedMin:0,
	               padding:0,
	               precision:0,
	               fontColor:"#666",
	               fontFamily:"'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
	               fontStyle:"normal",
	               fontSize:12,
	               lineHeight:1.2
	            },
	            display:true,
	            scaleLabel:{
	               display:false,
	               labelString:""
	            },
	            weight:0
	         }
	      ],
	      yAxes: null
	   }
}

var defaultBarChartOptions = defaultLineChartOptions;
var defaultRadarChartOptions = defaultLineChartOptions;
var defaultPolarChartOptions = {};
var defaultDonutChartOptions = {};
var defaultGaugeChartOptions = 
{
	sizeRatio: 60,
	innerRadius: 200,
	events: [""]
};

var defaultPieChartOptions = 
{
	cutoutPercentage:10
}

var yAxesNormal = [
{
    ticks:{
       display:true,
       beginAtZero:true,
       reverse:false,
       min:0,
       suggestedMin:0,
       adding:0,
       precision:0,
       fontColor:"#666",
       fontFamily:"'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
       fontStyle:"normal",
       fontSize:12,
       lineHeight:1.2,
       callback: 
    	   function(value, index, values) { 
    	   		if(value > 10000)
    	   			return value/1000+'k';
    	   		else
    	   			return value;
    	   }
    },
    scaleLabel:{
       display:false,
       labelString:""
    }
 }
]

var yAxesPercent = [
{
    ticks:{
       display:true,
       beginAtZero:true,
       reverse:false,
       min:0,
       max:100,
       adding:0,
       precision:0,
       fontColor:"#666",
       fontFamily:"'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
       fontStyle:"normal",
       fontSize:12,
       lineHeight:1.2
    },
    scaleLabel:{
       display:true,
       labelString:"PERCENT"
    }
 }
];

export function makeFacebookPopupWindow() {
  let width = 600;
  let height = 800;
  let url = 'https://www.facebook.com/sharer/sharer.php?u=http%3A%2F%2Fwww.findthemasks.com%2F&amp;src=sdkpreparse';
  var left = (screen.width/2)-(width/2);
  var top = (screen.height/2)-(height/2);
  var params = "url, 'popup', width=" + width + ",height=" + height + ",left=" + left + ",top=" + top;
  //return window.open(url, 'popup', width='+width+', height='+height+', left='+left+', top='+top+');
  alert ("params = " + params);
  //return window.open(params);
  }



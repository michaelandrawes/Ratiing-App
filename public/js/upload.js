$(document).ready(function(){

  //to work with btn
  $('.upload-btn').on('click',function(){
    $('#upload-input').click();
    $('.progress-bar').text('0%');
    $('.progress-bar').width('0%');
  });


//send data to server
$('#upload-input').on('change',function(){
  var uploadInput=$('#upload-input');
  if (uploadInput !='') {
    var formData= new FormData();
    formData.append('upload',uploadInput[0].files[0]);
    //ajax method to send data to server
    $.ajax({
      url:'/upload',
      type:'POST',
      data:formData,
      processData:false,
      contentType:false,
      success:function(data){
        $('#upload-input').val('');
      },
      //to work with progress bar
      xhr:function(){
        var xhr=new XMLHttpRequest();

        xhr.upload.addEventListener('progress',function(e){
          if (e.lengthComputable) {
            var uploadPercent=e.loaded/e.total;
            uploadPercent=(uploadPercent*100);

            $('.progress-bar').text(uploadPercent+'%');
            $('.progress-bar').width(uploadPercent+'%');

            if (uploadPercent===100) {
              $('.progress-bar').text('Completed');
              $('#completed').text('File Uploaded')
            }
          }
        },false);
        return xhr;
      }
    });
  }
});

});

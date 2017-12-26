//填充表格
$(document).ready(function(){
    paddingTable();
});

//填充表格
function paddingTable(){
    var innerHtml = '';
    for (var step=1; step<=20; step++) {
        innerHtml += '<tr id="dataId'+ step +'"><td>' + step + '</td>';
        innerHtml += '<td>小明' + step + '</td>';
        innerHtml += '<td>' + step + '11212</td>';
        if (step%2 === 0) {
            //偶数已发货
            var myButton = '<button type="button" class="btn btn-default" disabled>已发货</button>';
            innerHtml += '<td class="kuaidi">kk' + step + '</td>';
        } else {
            //基数未发货
            var myButton = '<button type="button" class="btn btn-primary open-postmodel" data-id=' + step +'>发货</button>';
            innerHtml += '<td class="kuaidi"></td>';
        }
        var changeBtn = '<button type="button" class="btn btn-info" style="margin-right: 10px">修改</button>';
        innerHtml += '<td>' + myButton + '</td></tr>';
    }
    $('#editArea').append(innerHtml);
}

//打开发货模态框，先填充tr的id
// function openPostModel(dataId){
//     $('#postModelHidden').val(dataId);
//     $('#postModel').modal('toggle');
// }
$(document).on('click', '.open-postmodel', function() {
    var dataId = 'dataId' + this.getAttribute("data-id");
    $('#postModelHidden').val(dataId);
    $('#postModel').modal('toggle');
})

//确认发货
$('#postData').click(function(){
    var kdId = $('#kuaidiId').val();
    if (!checkKuaiDiId(kdId)) {
        return false;
    }
    $('#postModel').modal('toggle');
    var trId = $('#postModelHidden').val();
    var kuaidiId = $('#' + trId + ' td.kuaidi').text(kdId);
    console.log(kuaidiId);
    console.log(trId);
    $('#' + trId + ' td:last-child button:last-child').prop('disabled', true);
    $('#' + trId + ' td:last-child button:last-child').removeClass('btn-primary');
    $('#' + trId + ' td:last-child button:last-child').addClass('btn-default');
    $('#' + trId + ' td:last-child button:last-child').text('已发货');
})

// function postData(){
//     var kdId = $('#kuaidiId').val();
//     if (!checkKuaiDiId(kdId)) {
//         return false;
//     }
//     $('#postModel').modal('toggle');
//     var trId = $('#postModelHidden').val();
//     var kuaidiId = $('#' + trId + ' td.kuaidi').text(kdId);
//     $('#' + trId + ' td:last-child button:last-child').prop('disabled', true);
//     $('#' + trId + ' td:last-child button:last-child').removeClass('btn-primary');
//     $('#' + trId + ' td:last-child button:last-child').addClass('btn-default');
//     $('#' + trId + ' td:last-child button:last-child').text('已发货');
// }

//校验快递单号
function checkKuaiDiId(id){
    var pattern = /^kk\d{6}$/;
    var exists = id.match(pattern);
    if (exists === null) {
        alert('快递单号格式错误');
        return false;
    }
    return true;
}
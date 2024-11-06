/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */

define(['N/record','N/http','N/task','N/runtime','N/search','N/url'], function(record, http,task,runtime,search,url) {
  function onRequest(context,id) 
  {
      try
      {
        var output = url.resolveDomain({hostType: url.HostType.APPLICATION,});
        var savedSearchId = context.request.parameters.custpage_repost_criteria;
        log.debug("savedSearchId",savedSearchId); 

        var templateID = context.request.parameters.custpage_template_id;
        log.debug("templateID",templateID); 

        var mrTask = task.create({taskType: task.TaskType.MAP_REDUCE,scriptId: 'customscript_mr_powercloud_gl_templates',deploymentId: 'customdeploy_mr_powercloud_gl_templates',params: {'custscript_search_id': savedSearchId,'custscript_template_id': templateID}});
        log.debug("mrTask",mrTask);

        mrTaskSubmit = mrTask.submit();
        log.debug("mrTaskSubmit",mrTaskSubmit);

        var MRSearch = search.create({type: "mapreducescript",columns: [{name: 'scriptid'}],filters: [{name: 'name',operator: 'is',values: 'MR__PowerCloudGLTemplates'}]}).run();
        var MRSearchRes = MRSearch.getRange({start : 0,end : 1000});
        var MRSearchResresult=MRSearchRes[0];
        log.debug("MRSearchResresult",MRSearchResresult);
        var scriptID = MRSearchResresult.id;
        log.debug("scriptID",scriptID);
        var mrScriptURL = 'https://'+output+'/app/common/scripting/mapreducescriptstatus.nl?daterange=TODAY&scripttype='+scriptID+'&jobstatefilterselect=unfinished';

        var LinkToSet = "<html>PROCESSED<a href='"+mrScriptURL+"'>Click Here For Status Page</a></html>";
        //LinkToSet = '<html>Custom item field help with a link. <a href="https://www.example.com">Web site</a></html>'
        log.debug("LinkToSet",LinkToSet);
        record.submitFields({type: "customrecord_power_gl_templates",id: templateID,values: {custrecord_historical_repost_status: "1",custrecord_power_gl_status_page: mrScriptURL},options: {enableSourcing: false,ignoreMandatoryFields : true}});

        context.response.write({output:"Historical Reposting is in Progress, Please Wait!!"});
      }catch(e)
      {
          log.debug("Error on Backend Suitelet",e);
          context.response.write({output:e.message});
      }
  }
  return {
      onRequest: onRequest
  };
});
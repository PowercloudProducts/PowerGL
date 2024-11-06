/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
 define(['N/record','N/search','N/error','N/ui/serverWidget','N/ui/message','N/https','/SuiteBundles/Bundle 509575/oauth', '/SuiteBundles/Bundle 509575/secret','N/runtime'], function(record,search,error,serverWidget,message,https,oauth, secret,runtime) {
  var processed = "1"
  var powerGL = "PowerGL"
  function beforeLoad(context) {
    log.debug("context.type",context.type);
    try
    {
      var accountId = runtime.accountId;
      var environment = runtime.envType;

      var prod_account_id = "null";
      var sb_account_id = "null";
      if(environment == "PRODUCTION")
      {
        prod_account_id = accountId;
      }
      else
      {
        sb_account_id = accountId;
      }
      
      var RestletUrl = secret.token.restletURL;

      //Get PowerGL Product ID from PowerCloud Account
      var GetPowerGLProductID = RestletUrl+prod_account_id+"&account_id_sb="+sb_account_id+"&individual_values="+false;
      var method= 'GET';
      var headers = oauth.getHeaders({url: GetPowerGLProductID,method: method,tokenKey: secret.token.public,tokenSecret: secret.token.secret});
             
      headers['Content-Type']='application/json';
      var PowerCloudProductDetailsResponse = https.get({ url: GetPowerGLProductID, headers: headers});
      var PowerCloudProductDetails = JSON.parse(PowerCloudProductDetailsResponse.body);
      var powerGLProductID = null;

      for(var prodIndex = 0; prodIndex < PowerCloudProductDetails.length; prodIndex++)
      {
        var productNameFromResponse = PowerCloudProductDetails[prodIndex].custrecord_power_license_product_name||null;
      
        if(productNameFromResponse == powerGL)
        {
          var powerGLProductID = PowerCloudProductDetails[prodIndex].custrecord_power_license_product_id||null;
          break;
        }
      }//prodIndex

      //Get PowerGL Product ID from PowerCloud Account Ends

      //Get Product Active Status & Category and Number of Templates Allowed.
      RestletUrlForPowerGLDetails = RestletUrl+prod_account_id+"&account_id_sb="+sb_account_id+"&product_id="+powerGLProductID+"&individual_values="+true;
      var method= 'GET';
      var headers = oauth.getHeaders({url: RestletUrlForPowerGLDetails,method: method,tokenKey: secret.token.public,tokenSecret: secret.token.secret});
    
      headers['Content-Type']='application/json';
      var ResponsedataFromRestlet = https.get({ url: RestletUrlForPowerGLDetails, headers: headers});
      var PowerGLRestletData = JSON.parse(ResponsedataFromRestlet.body);
      var templatesAllowed = null; 
      for(var DataIndex = 1; DataIndex < PowerGLRestletData.length; DataIndex++)
        {
          var Status = PowerGLRestletData[DataIndex].custrecord_power_license_other_status||null;
          var InActiveStatus = Status? "T": "F";

          log.debug("InActiveStatus ",InActiveStatus);

          if(InActiveStatus == "F")
          {
            templatesAllowed = PowerGLRestletData[DataIndex].custrecord_power_commit_no_of_temp_allow||null;
            log.debug("templatesAllowed ",templatesAllowed);
          }
        }//DataIndex
      //Get Product Active Status & Category and Number of Templates Allowed.ENDS

      //Get No.of Active PowerGL Templates

      var customrecord_power_gl_templatesSearchObj = search.create({
        type: "customrecord_power_gl_templates",
     filters:
            [
               ["isinactive","is","F"]
            ],
     columns:
            [
                search.createColumn({name: "custrecord_powergl_temp_template_name", label: "Template Name"}),
                search.createColumn({name: "custrecord_powergl_temp_transaction_type", label: "Transaction Type"}),
                search.createColumn({name: "created",sort: search.Sort.DESC,label: "Date Created"}),
                search.createColumn({name: "custrecord_powergl_temp_reposting_crite", label: "Reposting Criteria"})
            ]});
  
      var power_gl_templatesSearchRes = customrecord_power_gl_templatesSearchObj.run().getRange({start: 0,end: 1000});
      var numberOfActiveTemplates = power_gl_templatesSearchRes.length;
     
      //Get No.of Active PowerGL Template Ends
    }catch(e)
    {
      log.error("Error",e);
    }
    if(context.type=="create" && (templatesAllowed != null && numberOfActiveTemplates >= templatesAllowed))
    {
      errorObj = error.create({name: '🔔Upgrade your PowerGL Plan',message: '⚠️Creation Of PowerGL Templates More than '+templatesAllowed+' is not allowed)',notifyOff: false});
      throw errorObj.name + '<br \><br \>' + errorObj.message;
    }
    try{
          var currentForm = context.form;
          var formObj=context.newRecord
          
          var RepostStatus = formObj.getValue({fieldId:"custrecord_historical_repost_status"})||null;
          log.debug("RepostStatus",RepostStatus);
          
          if(context.type=="edit" || context.type=="create")
          {
            currentForm.getField({id : 'custrecord_power_gl_status_page'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            var cid = search.create({type: "clientscript",columns: [{name: 'scriptfile'}],filters: [{name: 'name',operator: 'is',values: 'CL_PowecloudGLTemplates'}]}).run();
            var currentRange = cid.getRange({start : 0,end : 1000});
            var result=currentRange[0];
            var fileId = result.getValue('scriptfile');
            log.debug("fileId",fileId);
            currentForm.clientScriptFileId = fileId;//Please make sure to replace this with internal ID of the Client script file in the File cabinet

            currentForm.addButton({id: 'custpage_remove_all_lines',label: 'Remove All Account Lines',functionName: 'triggerremoveALL()'});
            currentForm.addButton({id: 'custpage_remove_all_notes_lines',label: 'Remove All Notes Lines',functionName: 'triggerremoveALLnotes()'});
          }
         else if(context.type == "view" && RepostStatus != processed)
         {
           var recordID = formObj.id;
           log.debug("Template id",recordID)
           var cid = search.create({type: "clientscript",columns: [{name: 'scriptfile'}],filters: [{name: 'name',operator: 'is',values: 'CL_PowecloudGLTemplates'}]}).run();
           var currentRange = cid.getRange({start : 0,end : 1000});
           var result=currentRange[0];
           var fileId = result.getValue('scriptfile');
           log.debug("fileId",fileId);
           currentForm.clientScriptFileId = fileId;//Please make sure to replace this with internal ID of the Client script file in the File cabinet

           var transactionType = formObj.getValue({fieldId:"custrecord_powergl_temp_transaction_type"})||false;
           log.debug("transactionType",transactionType);

           //var RepostCriteria = getLatestPowerGLTemplate(transactionType)
           var RepostCriteria = formObj.getValue({fieldId:"custrecord_powergl_temp_reposting_crite"})||null;
           log.debug("RepostCriteria",RepostCriteria);

           var Inactive = formObj.getValue({fieldId:"isinactive"})||false;
           log.debug("Inactive",Inactive);
           
           currentForm.getField({id : 'custrecord_power_gl_status_page'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
           if(!Inactive)
           {             
              log.debug("Template Logs","templatesAllowed "+templatesAllowed+", numberOfActiveTemplates"+numberOfActiveTemplates);
              if(templatesAllowed == null || numberOfActiveTemplates <= templatesAllowed)
              {
                currentForm.addButton({id: 'custpage_repost_historical_gl',label: 'Repost Historical Transactions GL',functionName: 'repostHistoricalGL('+RepostCriteria+','+recordID+')'});
              }
           }
         }
    }catch(e)
    {
      log.debug("Error",e);
    }

  }

  function beforeSubmit(context) {
    if (context.type == context.UserEventType.DELETE) {            
                  var get_error= error.create({                  //prevent deleting
                      message: 'Cannot delete',
                      name:'prevent deleting ',
                      notifyOff: false
                  });
                  throw("Error: PowerGL Templates cannot be deleted. Kindly Inactivate the templates incase of not further usage.");
              }
    if (context.type == context.UserEventType.COPY || context.type == context.UserEventType.CREATE) 
            {            
              var formObj=context.newRecord
              var TemplateName=formObj.getValue({fieldId:"custrecord_powergl_temp_template_name"})||null;
              log.debug("TemplateName",TemplateName);
                 
              if(TemplateName != null)
             {
                var filters=new Array();
                var columns=new Array();
                filters[0]=search.createFilter({name:"custrecord_powergl_temp_template_name",operator:search.Operator.IS,values:TemplateName});
                columns[0]=search.createColumn({name:"custrecord_powergl_temp_template_name"});
                var PowerGLTemplateSrch=search.create({type:"customrecord_power_gl_templates",columns:columns,filters:filters});
 
                var PowerGLTemplateSrchRes=PowerGLTemplateSrch.run().getRange({start:0,end:1});
                log.debug("PowerGLTemplateSrchRes",PowerGLTemplateSrchRes);
                var PowerGLTemplateSrchResLen=PowerGLTemplateSrchRes.length;
                log.debug("PowerGLTemplateSrchResLen",PowerGLTemplateSrchResLen);

                if(PowerGLTemplateSrchResLen > 0)
                {
                  throw("Error: Template Name Should be Unique!!");
                }
            }
          }
  }
  function getLatestPowerGLTemplate(transactionType)
    {
      try 
      {
        var customrecord_power_gl_templatesSearchObj = search.create({
                              type: "customrecord_power_gl_templates",
                           filters:
                                  [
                                     ["isinactive","is","F"], 
                                     "AND", 
                                     ["custrecord_powergl_temp_transaction_type","anyof",transactionType]
                                  ],
                           columns:
                                  [
                                      search.createColumn({name: "custrecord_powergl_temp_template_name", label: "Template Name"}),
                                      search.createColumn({name: "custrecord_powergl_temp_transaction_type", label: "Transaction Type"}),
                                      search.createColumn({name: "created",sort: search.Sort.DESC,label: "Date Created"}),
                                      search.createColumn({name: "custrecord_powergl_temp_reposting_crite", label: "Reposting Criteria"})
                                  ]});
                        
        var power_gl_templatesSearchRes = customrecord_power_gl_templatesSearchObj.run().getRange({start: 0,end: 1000});
        log.debug("power_gl_templatesSearchRes	",power_gl_templatesSearchRes);

        if(power_gl_templatesSearchRes.length > 0)
        {
          var repostingCriteriatoReturn = power_gl_templatesSearchRes[0].getValue("custrecord_powergl_temp_reposting_crite")
          log.debug("repostingCriteriatoReturn ",repostingCriteriatoReturn);

          return repostingCriteriatoReturn;
        }
        else
        {
          return null;
        }
      } catch (error) {
        log.debug("error in getLatestPowerGLTemplate",error)
      }
    }
  return {
    beforeLoad: beforeLoad,
    beforeSubmit: beforeSubmit,
    //afterSubmit: afterSubmit
  }
});
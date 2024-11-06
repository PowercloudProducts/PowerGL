/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record','N/search','N/error','N/runtime','N/https','/SuiteBundles/Bundle 509575/oauth', '/SuiteBundles/Bundle 509575/secret','N/ui/serverWidget'], function(record,search,error,runtime,https,oauth,secret,serverWidget) {
  const powerGL = 'PowerGL';
  function beforeLoad(context) 
  {
    try
    {
      var currentForm = context.form;
      var powerGLConfSearchObj = search.create({
        type: "customrecord_powergl_configuration",
        filters:
            [
            ],
        columns:
            [
                search.createColumn({name: "custrecord_powergl_configuration_type", label: "Configuration Type"})
            ]});
  
      var powerGLConfSearchRes = powerGLConfSearchObj.run().getRange({start: 0,end: 1000});
      if(powerGLConfSearchRes.length > 0)
      {
        var configType = powerGLConfSearchRes[0].getValue("custrecord_powergl_configuration_type")||1;
        
        if(configType == "2")//V2 - Set Template Details in the Custom Record
        {
          currentForm.getField({id : 'custbody_powergl_template_name'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
          currentForm.getField({id : 'custbody_last_error_description'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
          currentForm.getField({id : 'custbody_date_of_reposting'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
          currentForm.getField({id : 'custbody_last_error_date'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
        }
      }
    }catch(e)
    {
      log.debug("Error in BeforeLoad ",e.message)
    }
  }

  function beforeSubmit(context) 
  {
    try 
    {
      log.debug("Mode ",context.type);
      if (context.type == 'copy' || context.type == 'create')
      {
        var LicenseStatus = checkLicenseActive();
        log.debug('License Status', LicenseStatus);

        var LicenseManagementModuleExists = checkLicenseModuleExists();
        log.debug("LicenseManagementModuleExists ",LicenseManagementModuleExists);

        if(LicenseStatus == false || LicenseManagementModuleExists == false)
        {
          log.debug("License Expired/Module Doesn't exists!!")
          return;
        }

        var formObj=context.newRecord
        formObj.setValue({fieldId:"custbody_powergl_template_name",value:null});
        formObj.setValue({fieldId:"custbody_date_of_reposting",value:null});
        formObj.setValue({fieldId:"custbody_last_error_date",value:null});
        formObj.setValue({fieldId:"custbody_last_error_description",value:null});
        formObj.setValue({fieldId:"custbody_powergl_override",value: false});
        formObj.setValue({fieldId:"custbody_gl_script_triggered",value: false});

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
              //log.debug("templatesAllowed ",templatesAllowed);
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

        if(templatesAllowed == null || numberOfActiveTemplates <= templatesAllowed)
          {
            formObj.setValue({fieldId:"custbody_license_active",value: true});
            log.debug("Values are set empty")
          }
      }
    } catch (error) 
    {
      log.debug({title: 'error in before submit',details: error})
    }
  }
  function afterSubmit(context) 
   {
      try {
            log.debug("runtime.executionContext ",runtime.executionContext);
            if (context.type == 'copy' || context.type == 'create') //GL Script won't have id in create mode
            {
              log.debug("runtime.executionContext triggers on csv import",runtime.executionContext);
              log.debug("After Submit Triggered for copy/edit before");
              var rec_id =context.newRecord.id
              log.debug("rec_id",rec_id)
              var objRecord = record.load({‌type: context.newRecord.type, id: context.newRecord.id}); 
              objRecord.save(); 
              log.debug("After Submit Triggered for copy/edit");
            }
           } catch (error) 
            {
              log.debug({title: 'error ',details: error})
              log.debug("ERROR",error);
              var powergl_configurationSearchRes = search.create({type: "customrecord_powergl_configuration",
                                                  filters:[],
                                                  columns:[search.createColumn({name: "custrecord_powergl_configuration_type", label: "Configuration Type"})]}).run().getRange({ start: 0, end: 1000 });

              log.debug("powergl_configurationSearchRes ",powergl_configurationSearchRes);
              var configurationType = 1;

              if(powergl_configurationSearchRes.length > 0)
              {
                configurationType = powergl_configurationSearchRes[0].getValue({name: "custrecord_powergl_configuration_type"});
                log.debug("configurationType  ",configurationType);
              }
              if(configurationType == "1")//Set Template Details in The Transaction
              {
                record.submitFields({type: recordType,id: rec_id,values: {'custbody_last_error_date':new Date(),'custbody_last_error_description':error.message},options: {enablesourcing: true,}});
              }
              else if(configurationType == "2")//Set Template Details in the Custom Record	Set
              {
                var powerGLPropsSearchRes = search.create({type: "customrecord_powergl_properties",
                filters:[["custrecord_powergl_parent_transaction","anyof",rec_id]],
                columns:
                        [
                          search.createColumn({name: "custrecord_powergl_template", label: "PowerGL Template ID"}),
                          search.createColumn({name: "custrecord_powergl_date_of_reposting", label: "Date of Reposting"}),
                          search.createColumn({name: "custrecord_powergl_last_error_descript", label: "Last Error Description"}),
                          search.createColumn({name: "custrecord_powergl_last_error_date", label: "Last Error Date"})
                        ]
                }).run().getRange({ start: 0, end: 1000 }); 

                log.debug("powerGLPropsSearchRes  ",powerGLPropsSearchRes);
                if(powerGLPropsSearchRes.length > 0)
                {
                  var propertiesInternalID = powerGLPropsSearchRes[0].id;
                  log.debug("propertiesInternalID  ",propertiesInternalID);
                  record.submitFields({type: "customrecord_powergl_properties",id: propertiesInternalID,values: {'custrecord_powergl_last_error_date':new Date(),'custrecord_powergl_last_error_descript':error.message},options: {enablesourcing: true,}});
                }
                else
                {
                  var NewpowerGLProperty = record.create({type: "customrecord_powergl_properties"});
                  NewpowerGLProperty.setValue({fieldId: "custrecord_powergl_parent_transaction",value: rec_id})
                  NewpowerGLProperty.setValue({fieldId: "custrecord_powergl_template",value: null})
                  NewpowerGLProperty.setValue({fieldId: "custrecord_powergl_date_of_reposting",value: null})
                  NewpowerGLProperty.setValue({fieldId: "custrecord_powergl_last_error_date",value: new Date()})
                  NewpowerGLProperty.setValue({fieldId: "custrecord_powergl_last_error_descript",value: error.message});
                  NewpowerGLProperty.save();
                }
              }
            }
        }
  function checkLicenseActive()
  {
    try
    {
      var accountId = runtime.accountId;
      var environment = runtime.envType;

      log.debug("accountId",accountId);
      log.debug("environment",environment);

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
      log.debug("RestletUrl ",RestletUrl);

      RestletUrl = RestletUrl+prod_account_id+"&account_id_sb="+sb_account_id+"&individual_values="+false;
      var method= 'GET';
      var headers = oauth.getHeaders({url: RestletUrl,method: method,tokenKey: secret.token.public,tokenSecret: secret.token.secret});
            
      headers['Content-Type']='application/json';
      var dataFromRestlet = https.get({ url: RestletUrl, headers: headers});
      log.debug("Restlet Data",dataFromRestlet.body);

      var RestletData = JSON.parse(dataFromRestlet.body);
      log.debug("RestletData ",RestletData);
      
      var ActiveLicense = false;
      for(var prodIndex = 0; prodIndex < RestletData.length; prodIndex++)
      {
          var productName = RestletData[prodIndex].custrecord_power_license_product_name;
          log.debug("productName  ",productName);

          if(productName == powerGL)
          {
              ActiveLicense = RestletData[prodIndex].custrecord_power_license_status;
          }
      }//prodIndex
      log.debug("ActiveLicense  ",ActiveLicense);
      return ActiveLicense;
    }catch(e)
    {
      log.debug("Error on checkLicense Active",e);
    }
  }
  function checkLicenseModuleExists()
  {
    try 
    {
      var scriptdeploymentSearchObj = search.create({type: "scriptdeployment",filters:[["title","is","Suitelet-PowerCloudProductDetail(Client)"], "AND", ["isdeployed","is","T"]],columns:[search.createColumn({name: "title",sort: search.Sort.ASC,label: "Title"}),search.createColumn({name: "status", label: "Status"}),search.createColumn({name: "isdeployed", label: "Is Deployed"})]}).run();
      var scriptdeploymentSearchRes = scriptdeploymentSearchObj.getRange({ start: 0, end: 1000 });
      log.debug("scriptdeploymentSearchRes  ",scriptdeploymentSearchRes);
      if(scriptdeploymentSearchRes.length > 0)
      {
        return true;
      }
      return false;
    } catch (error) {
      log.debug("checkLicenseModuleExists ",checkLicenseModuleExists);
    }
  }
  return {
    beforeLoad: beforeLoad,
    beforeSubmit: beforeSubmit,
    afterSubmit: afterSubmit
  }
});
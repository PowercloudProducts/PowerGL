  /**
   * @NApiVersion 2.x
   * @NScriptType MapReduceScript
   * @NModuleScope SameAccount
   */
  define(['N/format', 'N/record', 'N/search','N/runtime','N/task','/SuiteBundles/Bundle 509575/oauth', '/SuiteBundles/Bundle 509575/secret','N/runtime','N/https'],
    /**
     * @param {format} format
     * @param {record} record
     * @param {search} search
     */
    function(format, record, search,runtime,task,oauth,secret,runtime,https) {
        const powerGL = 'PowerGL';
        /**
         * Marks the beginning of the Map/Reduce process and generates input data.
         *
         * @typedef {Object} ObjectRef
         * @property {number} id - Internal ID of the record instance
         * @property {string} type - Record type id
         *
         * @return {Array|Object|Search|RecordRef} inputSummary
         * @since 2015.1
         */
        function getInputData() {
          try{
              var searchID = runtime.getCurrentScript().getParameter({name:'custscript_search_id'});
              log.debug("searchID",searchID);
  
              var mySearch = search.load({id: searchID});
              RefundSearchRes = mySearch.run().getRange({start: 0,end: 100});
              log.debug("RefundSearchRes	",RefundSearchRes);
  
              var LicenseStatus = checkLicenseActive();
              log.debug('License Status', LicenseStatus);
  
              var LicenseManagementModuleExists = checkLicenseModuleExists();
              log.debug("LicenseManagementModuleExists ",LicenseManagementModuleExists);
  
              if(LicenseStatus == false || LicenseManagementModuleExists == false)
             {
               log.debug("License Expired/Module Doesn't exists!!")
               return;
             }
            return mySearch;
          }catch(e)
            {
              log.debug({title:"ERROR",details:e});
            }
        }
        /**
         * Executes when the map entry point is triggered and applies to each key/value pair.
         *
         * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
         * @since 2015.1
         **/
      function map(context)
      {
        try
          {
            log.debug("CONTEXT",context);
            var data = JSON.parse(context.value);
            log.debug({title:"DATA",details:data});
            var rec_id=data.id;
            log.debug("rec_id",rec_id);
  
            var recordType=data.recordType;
            log.debug("recordType",recordType);
  
            /* record.submitFields({type: recordType,id: rec_id,values: {'custbody_license_active':true},options: {enablesourcing: true,}});
            log.debug("Record submitted"); */
            var transObj = record.load({type: recordType,id: rec_id,isDynamic: true,});
            transObj.setValue({fieldId: "custbody_license_active",value: true})
            var TransactionUpdated=transObj.save({enableSourcing: true,ignoreMandatoryFields: true});
            log.debug("TransactionUpdated",TransactionUpdated);
  
          }catch(e)
          {
            log.debug("ERROR",e);
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
              record.submitFields({type: recordType,id: rec_id,values: {'custbody_last_error_date':new Date(),'custbody_last_error_description':e.message},options: {enablesourcing: true,}});
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

                  record.submitFields({type: "customrecord_powergl_properties",id: propertiesInternalID,values: {'custrecord_powergl_last_error_date':new Date(),'custrecord_powergl_last_error_descript':e.message},options: {enablesourcing: true,}});
                }
                else
                {
                  var NewpowerGLProperty = record.create({type: "customrecord_powergl_properties"});
                  NewpowerGLProperty.setValue({fieldId: "custrecord_powergl_parent_transaction",value: rec_id})
                  NewpowerGLProperty.setValue({fieldId: "custrecord_powergl_template",value: null})
                  NewpowerGLProperty.setValue({fieldId: "custrecord_powergl_date_of_reposting",value: null})
                  NewpowerGLProperty.setValue({fieldId: "custrecord_powergl_last_error_date",value: new Date()})
                  NewpowerGLProperty.setValue({fieldId: "custrecord_powergl_last_error_descript",value: e.message});
                  NewpowerGLProperty.save();
                }
             }
            }
          }
        /**
         * Executes when the reduce entry point is triggered and applies to each group.
         *
         * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
         * @since 2015.1
         */
        function reduce(context)
        {
  
        }
        /**
         * Executes when the summarize entry point is triggered and applies to the result set.
         *
         * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
         * @since 2015.1
         */
        function summarize(summary) {
          try {
                var LicenseStatus = checkLicenseActive();
                log.debug('License Status in summary', LicenseStatus);
  
                var LicenseManagementModuleExists = checkLicenseModuleExists();
                log.debug("LicenseManagementModuleExists in summary",LicenseManagementModuleExists);
  
                if(LicenseStatus == false || LicenseManagementModuleExists == false)
                {
                  log.debug("License Expired/Module Doesn't exists!!")
                  return;
                }
                else
                {
                  var templateID = runtime.getCurrentScript().getParameter({name:'custscript_template_id'});
                  log.debug("templateID at summarize",templateID);
                  record.submitFields({type: "customrecord_power_gl_templates",id: templateID,values: {custrecord_historical_repost_status: "2"},options: {enableSourcing: false,ignoreMandatoryFields : true}});
                }
          } catch (error) {
            log.debug("Error in summarize",error)
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
            getInputData: getInputData,
            map: map,
          //reduce: reduce,
            summarize: summarize
        };
  
    });
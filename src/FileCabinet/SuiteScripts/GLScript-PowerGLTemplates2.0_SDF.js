/**
 * @NApiVersion 2.1
 * @NScriptType customglplugin
 */
define(['N/record','N/search','N/error','N/runtime','N/https','/SuiteBundles/Bundle 509575/oauth', '/SuiteBundles/Bundle 509575/secret','N/ui/serverWidget'], function(record,search,error,runtime,https,oauth,secret,serverWidget) {
  const powerGL = 'PowerGL';
  function customizeGlImpact(context) {
      try
      {
          var customLines = context.customLines;
          var transactionRecord = context.transactionRecord;
          var customLines = context.customLines;
          var standardLines = context.standardLines;

          var LicenseStatus = checkLicenseActive();
          log.debug('License Status', LicenseStatus);

          var LicenseManagementModuleExists = checkLicenseModuleExists();
          log.debug("LicenseManagementModuleExists ",LicenseManagementModuleExists);

          if(LicenseStatus == false || LicenseManagementModuleExists == false)
          {
              log.debug("License Expired/Module Doesn't exists!!")
              return;
          }
          
          var rectype = transactionRecord.recordType;
          var recid   = transactionRecord.id;
          log.debug('DEBUG recid',recid);
          log.debug('DEBUG rectype',rectype);

          if (recid === '' || recid === null || recid === undefined) 
          {
              log.debug('DEBUG', 'recId = EMPTY', 'on create/copy'); 
              return;
          }

          var TransObj = record.load({type: rectype,id: recid});
          var barredFromPosting = TransObj.getValue({fieldId: 'custbody_powergl_override'})||false;
          log.debug('DEBUG barredFromPosting',barredFromPosting);

          if(barredFromPosting) 
          {
              log.debug("Transaction "+rectype+" is barred from posting, Internal ID:", recid);
              var powergl_propertiesSearch = TransactionPropertiesSearch(recid)
              log.debug('DEBUG powergl_propertiesSearch',powergl_propertiesSearch);
            
              if(powergl_propertiesSearch.length > 0)
              {
                  var powerGLPropID = powergl_propertiesSearch[0].id;
                  log.debug('DEBUG powerGLPropID',powerGLPropID);
              }
              return;
          }
          var transactionID = TransObj.getValue({fieldId: 'tranid'})||null;
          log.debug('DEBUG transactionID',transactionID);

          //Configuration Record Search
          var configurationType = powerGLConfigurationType()
          log.debug("configurationType ",configurationType);
          //Configuration Record Search Ends 

          var recID = getRecTypeID(rectype);
          log.debug('DEBUG recID',recID);

          var customPowerGLTemplateSearchRes = getCustomSearchRes(recID)
          log.debug('DEBUG customPowerGLTemplateSearchRes',customPowerGLTemplateSearchRes);

          if(customPowerGLTemplateSearchRes.length > 0)
          {
              log.debug('Templates found form item type');
              for (var i = 0; i < customPowerGLTemplateSearchRes.length; i++)
              {
                  var TemplateID = customPowerGLTemplateSearchRes[i].id //Only latest created template will be considered
                  var searchID = customPowerGLTemplateSearchRes[i].getValue('custrecord_powergl_temp_reposting_crite');
                  log.debug('DEBUG searchID',searchID);
    
                  var checkIFTransactionExists = CheckTransactionExistsInSearch(searchID,recid,transactionID);
                  log.debug('DEBUG checkIFTransactionExists',checkIFTransactionExists);
    
                  if(checkIFTransactionExists != true){log.debug('DEBUG Record Do not exists in the search',recid); continue;} 
                    
                  var PowerGLTemplateObj = record.load({type: 'customrecord_power_gl_templates',id: TemplateID});
                  var TemplateLineCount = PowerGLTemplateObj.getLineCount({sublistId: "recmachcustrecord_powergl_account_parent"});
                  
                  log.debug('DEBUG TemplateLineCount',TemplateLineCount);

                  var LineCanBeAdded = checkAddingGLLines(TemplateID,standardLines,rectype,recid)
                  log.debug('DEBUG LineCanBeAdded',LineCanBeAdded);
                  if(!LineCanBeAdded){return;}
                  for (var index = 0; index < TemplateLineCount; index++) 
                  {
                      var sourceAccount = PowerGLTemplateObj.getSublistValue({sublistId: "recmachcustrecord_powergl_account_parent",fieldId: "custrecord_power_gl_source_account",line: index});
                      
                      var destinationAccount = PowerGLTemplateObj.getSublistValue({sublistId: "recmachcustrecord_powergl_account_parent",fieldId: "custrecord_power_gl_destination_account",line: index});
                      
                      var movementPercent = PowerGLTemplateObj.getSublistValue({sublistId: "recmachcustrecord_powergl_account_parent",fieldId: "custrecord_power_gl_percentage",line: index});
                      
                      var movementAmount = PowerGLTemplateObj.getSublistValue({sublistId: "recmachcustrecord_powergl_account_parent",fieldId: "custrecord_power_gl_movement_amount",line: index})||null;
                      log.debug("standardLines ",standardLines);
                      var GLLineCount = standardLines.count;
                      for (var GLLineIndex=0; GLLineIndex<GLLineCount; GLLineIndex++) 
                      {
                         //get the value of NetSuite's GL posting
                          var line =  standardLines.getLine({index: GLLineIndex})
                         //details from standard lines
                         var AccntID = line.accountId||null;
                      
                         if(AccntID != sourceAccount)
                         {
                           continue;
                         }
                         var debitAmount = line.debitAmount||0.00;
                         var creditAmount = line.creditAmount||0.00;
                         var classID = line.classId||null;
                         var departmentID = line.departmentId||null;
                         var memoValue = line.memo||null;
                         var subsidiaryID = line.subsidiaryId||null;
                         var entityID = line.entityId||null;
                         var locationID = line.locationId||null;
                         var postingTrans = line.isPosting||null;
    
                         if(debitAmount > 0)
                         {
                           debitAmount = parseFloat(debitAmount).toFixed(2);
                         }
                         if(creditAmount > 0)
                         {
                           creditAmount = parseFloat(creditAmount).toFixed(2);
                         }
                        
                         var amountToSet = 0.00;
                         if(debitAmount == 0.00)
                         {
                           amountToSet = calculateAmountToSet(movementPercent,movementAmount,creditAmount)
                           log.debug('amountToSet',amountToSet);
    
                           creditAmount = parseFloat(creditAmount)
                           amountToSet = parseFloat(amountToSet)
                            
                           if(amountToSet > creditAmount)
                           {
                             amountToSet = creditAmount;
                           }
                           if(amountToSet == 0)
                           {
                             errorMessage = "Template Amount Should Not Be 0";
                             errorManagement(rectype, recid, errorMessage,configurationType);
                             return;
                           }
                        
                           var newLine1 = customLines.addNewLine();
                           newLine1.accountId = parseInt(sourceAccount);
                           newLine1.debitAmount = Number(amountToSet);
                           newLine1.memo = memoValue;
                           newLine1.entityId = entityID;
                           newLine1.departmentId = departmentID;
                           newLine1.classId = classID;
                           newLine1.locationId = locationID;
                           
                           var newLine = customLines.addNewLine();
                           newLine.accountId = parseInt(destinationAccount);
                           newLine.creditAmount = Number(amountToSet);
                           newLine.memo = memoValue;
                           newLine.entityId = entityID;
                           newLine.departmentId = departmentID;
                           newLine.classId = classID;
                           newLine.locationId = locationID;
                           
                           repostSuccess = "true";
                         }
                         if(creditAmount == 0.00)
                         {
                           amountToSet = calculateAmountToSet(movementPercent,movementAmount,debitAmount)
                           log.debug('amountToSet',amountToSet);

                           debitAmount = parseFloat(debitAmount);
                           amountToSet = parseFloat(amountToSet);
                           
                           if(amountToSet > debitAmount)
                           {
                             amountToSet = debitAmount;
                           }
    
                           if(amountToSet == 0)
                           {
                             errorMessage = "Template Amount Should Not Be 0"
                             errorManagement(rectype, recid, errorMessage,configurationType);
                             return;
                           }
                           
                            var newLine = customLines.addNewLine();
                            newLine.accountId = parseInt(sourceAccount);
                            newLine.creditAmount = Number(amountToSet)
                            newLine.memo = memoValue;
                            newLine.entityId = entityID;
                            newLine.departmentId = departmentID;
                            newLine.classId = classID;
                            newLine.locationId = locationID;
    
                            var newLine1 = customLines.addNewLine();
                            newLine1.accountId = parseInt(destinationAccount);
                            newLine1.debitAmount = Number(amountToSet)
                            newLine1.memo = memoValue;
                            newLine1.entityId = entityID;
                            newLine1.departmentId = departmentID;
                            newLine1.classId = classID;
                            newLine1.locationId = locationID;
                              
                            repostSuccess = "true";
                         }
                      }//GLLineIndex
                  }//index
    
                    if(repostSuccess == "true")//At least 2 lines added
                    {
                        if(configurationType == "1")//Set Template Details in The Transaction
                        {
                          record.submitFields({type: rectype,id: recid,
                              values: {
                                  'custbody_last_error_date': null,
                                  'custbody_last_error_description': null,
                                  'custbody_powergl_template_name': TemplateID,
                                  'custbody_date_of_reposting': new Date(),
                                  'custbody_gl_script_triggered': true
                              }});
                        }
                        else if(configurationType == "2")//Set Template Details in the Custom Record	Set
                        {
                          var powergl_propertiesSearch = TransactionPropertiesSearch(recid)
                          log.debug("powergl_propertiesSearch ",powergl_propertiesSearch);
                          if(powergl_propertiesSearch.length > 0)
                          {
                            var powerGLPropID = powergl_propertiesSearch[0].id;
                            
                            record.submitFields({type: 'customrecord_powergl_properties',id: powerGLPropID,
                              values: {
                                  'custrecord_powergl_last_error_date': null,
                                  'custrecord_powergl_last_error_descript': null,
                                  'custrecord_powergl_template': TemplateID,
                                  'custrecord_powergl_date_of_reposting': new Date(),
                              }});
                          }
                          else
                          {
                            var powerGLPropObj = record.create({type: 'customrecord_powergl_properties'});
                            powerGLPropObj.setValue({fieldId: 'custrecord_powergl_parent_transaction',value: recid});
                            powerGLPropObj.setValue({fieldId: 'custrecord_powergl_template',value: TemplateID});
                            powerGLPropObj.setValue({fieldId: 'custrecord_powergl_date_of_reposting',value: new Date()});
                            powerGLPropObj.setValue({fieldId: 'custrecord_powergl_last_error_date',value: null});
                            powerGLPropObj.setValue({fieldId: 'custrecord_powergl_last_error_descript',value: null});
                            var powerGLPropertyID = powerGLPropObj.save({enableSourcing: true,ignoreMandatoryFields: true})
                            log.debug("powerGLPropertyID  ",powerGLPropertyID);
                          }
                        }
                    break;
                  }
                }//i loop
          }
          else
          {
              if(configurationType == "1")//Set Template Details in The Transaction
              {
                  record.submitFields({type: rectype,id: recid,
                      values: {
                          'custbody_last_error_date': null,
                          'custbody_last_error_description': null,
                          'custbody_powergl_template_name': null,
                          'custbody_date_of_reposting': null,
                          'custbody_gl_script_triggered': false
                      }});
              }
              log.debug('DEBUG No custom template found for record type', recID);
          }
      }catch(e)
      {
          log.debug('DEBUGcustomizeGlImpact Error', e);
          //GL Posting is Not Success
          if(configurationType == "1")//Set Template Details in The Transaction
          {
            record.submitFields({type: rectype,id: recid,
              values: {
                  'custbody_last_error_date': new Date(),
                  'custbody_last_error_description': e.message,
                  'custbody_powergl_template_name': null,
                  'custbody_date_of_reposting': null,
                  'custbody_gl_script_triggered': false
              }});
          }
          else if(configurationType == "2")//Set Template Details in the Custom Record	Set
          {
            var powergl_propertiesSearch = TransactionPropertiesSearch(recid)
            log.debug('DEBUG powergl_propertiesSearch',powergl_propertiesSearch);
            
            if(powergl_propertiesSearch.length > 0)
            {
              var powerGLPropID = powergl_propertiesSearch[0].id;
              log.debug('DEBUG powerGLPropID',powerGLPropID);
              record.submitFields({type: 'customrecord_powergl_properties',id: powerGLPropID,
                  values: {
                              'custrecord_powergl_last_error_date': new Date(),
                              'custrecord_powergl_last_error_descript': e.message,
                              'custrecord_powergl_template': null,
                              'custrecord_powergl_date_of_reposting': null,
                          }});
             }
             else
             {
               var powerGLPropObj = record.create({type: 'customrecord_powergl_properties'});
               powerGLPropObj.setValue({fieldId: 'custrecord_powergl_parent_transaction',value: recid});
               powerGLPropObj.setValue({fieldId: 'custrecord_powergl_template',value: null});
               powerGLPropObj.setValue({fieldId: 'custrecord_powergl_date_of_reposting',value: null});
               powerGLPropObj.setValue({fieldId: 'custrecord_powergl_last_error_date',value: new Date()});
               powerGLPropObj.setValue({fieldId: 'custrecord_powergl_last_error_descript',value: e.message});
               var powerGLPropertyID = powerGLPropObj.save({enableSourcing: true,ignoreMandatoryFields: true})
               log.debug("powerGLPropertyID  ",powerGLPropertyID);
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
    //log.debug("RestletUrl ",RestletUrl);

    RestletUrl = RestletUrl+prod_account_id+"&account_id_sb="+sb_account_id+"&individual_values="+false;
    var method= 'GET';
    var headers = oauth.getHeaders({url: RestletUrl,method: method,tokenKey: secret.token.public,tokenSecret: secret.token.secret});
          
    headers['Content-Type']='application/json';
    var dataFromRestlet = https.get({ url: RestletUrl, headers: headers});
    //log.debug("Restlet Data",dataFromRestlet.body);

    var RestletData = JSON.parse(dataFromRestlet.body);
    //log.debug("RestletData ",RestletData);
    
    var ActiveLicense = false;
    for(var prodIndex = 0; prodIndex < RestletData.length; prodIndex++)
    {
        var productName = RestletData[prodIndex].custrecord_power_license_product_name;
        //log.debug("productName  ",productName);

        if(productName == powerGL)
        {
            ActiveLicense = RestletData[prodIndex].custrecord_power_license_status;
        }
    }//prodIndex
    //log.debug("ActiveLicense  ",ActiveLicense);
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
    //log.debug("scriptdeploymentSearchRes  ",scriptdeploymentSearchRes);
    if(scriptdeploymentSearchRes.length > 0)
    {
      return true;
    }
    return false;
  } catch (error) {
    log.debug("checkLicenseModuleExists ",checkLicenseModuleExists);
  }
}
function TransactionPropertiesSearch(recid)
  {
  try
  { 
      var transactionResults = search.create({
          type: "customrecord_powergl_properties",
          filters:
          [
             ["custrecord_powergl_parent_transaction","anyof",recid]
          ],
          columns:
          [
             search.createColumn({name: "custrecord_powergl_template", label: "PowerGL Template ID"})
          ]
       }).run().getRange({ start: 0, end: 10});

      log.debug('DEBUG TransactionPropertiesSearch in function', transactionResults);
      return transactionResults;
}catch(e)
{
  log.debug('DEBUG Error on TransactionPropertiesSearch function', e.message);
}
}
function powerGLConfigurationType()
{
  try
  {
      var powerGLConfSearchRes = search.create({type: "customrecord_powergl_configuration",
          filters:
          [
          ],
          columns:
          [
             search.createColumn({name: "custrecord_powergl_configuration_type", label: "Configuration Type"})
          ]
       }).run().getRange({ start: 0, end: 10});

       var configurationType = 1;
       if(powerGLConfSearchRes.length > 0)
       {
          configurationType = powerGLConfSearchRes[0].getValue("custrecord_powergl_configuration_type")||"1"
       }
       log.debug("configurationType   ",configurationType);
       return configurationType;
  }catch(e)
  {
      log.debug("Error in ",e.message)
  }
}
function getCustomSearchRes(recID)
{
  try
  {
      var powerGLTemplateRes = search.create({
          type: "customrecord_power_gl_templates",
          filters:
          [
             ["isinactive","is","F"], 
             "AND", 
             ["custrecord_powergl_temp_transaction_type","anyof",recID]
          ],
          columns:
          [
             search.createColumn({name: "custrecord_powergl_temp_template_name", label: "Template Name"}),
             search.createColumn({name: "custrecord_powergl_temp_transaction_type", label: "Transaction Type"}),
             search.createColumn({name: "created", label: "Date Created",sort:"DESC"}),
             search.createColumn({name: "custrecord_powergl_temp_reposting_crite", label: "Reposting Criteria"})
          ]
       }).run().getRange({ start: 0, end: 1000});
       log.debug("powerGLTemplateRes in function",powerGLTemplateRes);
       return powerGLTemplateRes;
  }catch(e)
  {
      log.debug("Error on getCustomSearchRes",e.message)
  }
}
function CheckTransactionExistsInSearch(searchID,recordID,transactionID)
{
try 
{
     var TransactionSavedSearch = search.load({id: searchID});
     var InternalIDFilter =  search.createFilter({name: 'internalid',operator: search.Operator.ANYOF,values: recordID});
     var savedSearchFilters = TransactionSavedSearch.filters;
   savedSearchFilters.push(InternalIDFilter);

     if(transactionID != null)
     {
       var documentNOFilter =  search.createFilter({name: 'tranid',operator: search.Operator.IS,values: transactionID});
       savedSearchFilters.push(documentNOFilter);
     }

     var TransactionSavedSearchRes = TransactionSavedSearch.run().getRange({ start: 0, end: 100});
     log.debug("powerGLTemplateRes in function",TransactionSavedSearchRes);
     if(TransactionSavedSearchRes.length > 0)
     {
       return true;
     }
     else
     {
       return false;
     }
} catch (error) 
{
   log.debug('DEBUG Error in CheckTransactionExistsInSearch', error); 
   return false;
}
}
function checkAddingGLLines(TemplateID,standardLines,rectype,recid)
{
try 
{
  var PowerGLTemplateObj = record.load({type: 'customrecord_power_gl_templates',id: TemplateID});
  var TemplateLineCount = PowerGLTemplateObj.getLineCount({sublistId: "recmachcustrecord_powergl_account_parent"});
  log.debug('DEBUG TemplateLineCount',TemplateLineCount);
  log.debug("standardLines    ",standardLines);
  var GLLineCount = standardLines.count;
log.debug('DEBUG GLLineCount',GLLineCount);

  var accntMap = []; 
  var creditArray = [];
  var debitArray = []
  for (var GLLineIndex=0; GLLineIndex<GLLineCount; GLLineIndex++) 
  {
    //get the value of NetSuite's GL posting
    var line =  standardLines.getLine({index: GLLineIndex});
    //details from standard lines

    log.debug("line   ",line);
    var currentAccntID = line.accountId||null;
    log.debug("currentAccntID   ",currentAccntID);
    var currentDebitAmount = line.debitAmount||0.00;
    log.debug("currentDebitAmount   ",currentDebitAmount);
    var currentCreditAmount = line.creditAmount||0.00;
    log.debug("currentCreditAmount   ",currentCreditAmount);

    if(currentAccntID == null){continue;}//Getting Empty Accounts With Amount Lines

    if (currentDebitAmount != 0.00) 
    {
      var AccntIndex = debitArray.indexOf(currentAccntID);

      if (AccntIndex !== -1) 
      {
        debitArray[AccntIndex + 1] = parseFloat(debitArray[AccntIndex + 1]) + parseFloat(currentDebitAmount);
      } else 
      {
        debitArray.push(currentAccntID, currentDebitAmount);
      }
    }
    if (currentCreditAmount != 0.00) 
    {
      var AccntIndex = creditArray.indexOf(currentAccntID);

      if (AccntIndex !== -1) 
      {
        creditArray[AccntIndex + 1] = parseFloat(creditArray[AccntIndex + 1]) + parseFloat(currentCreditAmount);
      } 
      else 
      {
        creditArray.push(currentAccntID, currentCreditAmount);
      }
    }
  }//GLLineIndex
  log.debug('DEBUG debitArray checkAddingGLLines',debitArray);
  log.debug('DEBUG creditArray checkAddingGLLines',creditArray);

  for(var credIndex = 0; credIndex < creditArray.length;)
    {
      var credAccount = creditArray[credIndex];

      var credAmount = creditArray[credIndex+1];

      var templateAmount = 0;
      
      for (var index = 0; index < TemplateLineCount; index++) 
      {
        var sourceAccount = PowerGLTemplateObj.getSublistValue({sublistId: "recmachcustrecord_powergl_account_parent",fieldId: "custrecord_power_gl_source_account",line: index});
        log.debug('DEBUG sourceAccount',sourceAccount);

        if(sourceAccount != credAccount){continue;}
        var movementPercent = PowerGLTemplateObj.getSublistValue({sublistId: "recmachcustrecord_powergl_account_parent",fieldId: "custrecord_power_gl_percentage",line: index});
        log.debug('DEBUG movementPercent',movementPercent);

        var movementAmount = PowerGLTemplateObj.getSublistValue({sublistId: "recmachcustrecord_powergl_account_parent",fieldId: "custrecord_power_gl_movement_amount",line: index})||null;
        log.debug('DEBUG movementAmount',movementAmount);

        var amountTSet = calculateAmountToSet(movementPercent,movementAmount,credAmount)
        
        templateAmount += parseFloat(amountTSet);
        log.debug('DEBUG templateAmount',templateAmount);
        
        if(templateAmount > credAmount)
        {
            errorMessage = "Template Amount Should Be Less Than Or Equal to The Transaction Line Amount!!";
            errorManagement(rectype, recid, errorMessage,configurationType)
            return false;
        }
       }//index
      credIndex = credIndex+2;
    }//credIndex

    for(var debitIndex = 0; debitIndex < debitArray.length;)
    {
      var debAccount = debitArray[debitIndex];

      var debAmount = debitArray[debitIndex+1];

      var templateAmount = 0;
      
      for (var index = 0; index < TemplateLineCount; index++) 
      {
        var sourceAccount = PowerGLTemplateObj.getSublistValue({sublistId: "recmachcustrecord_powergl_account_parent",fieldId: "custrecord_power_gl_source_account",line: index});
        
        if(sourceAccount != debAccount){continue;}

        var movementPercent = PowerGLTemplateObj.getSublistValue({sublistId: "recmachcustrecord_powergl_account_parent",fieldId: "custrecord_power_gl_percentage",line: index});
        log.debug('DEBUG movementPercent',movementPercent);

        var movementAmount = PowerGLTemplateObj.getSublistValue({sublistId: "recmachcustrecord_powergl_account_parent",fieldId: "custrecord_power_gl_movement_amount",line: index})||null;
        log.debug('DEBUG movementAmount',movementAmount);
        
        var amountToSet = calculateAmountToSet(movementPercent,movementAmount,debAmount)
        templateAmount += parseFloat(amountToSet);
        log.debug('DEBUG templateAmount',templateAmount);
        if(templateAmount > debAmount)
        {
            errorMessage = "Template Amount Should Be Less Than Or Equal to The Transaction Line Amount!!";
            errorManagement(rectype, recid, errorMessage,configurationType)
            return false;
        }
       }//index
      debitIndex = debitIndex+2;
    }//debitIndex
  return true;
} catch (error) {
     log.debug('DEBUG Error in checkAddingGLLines', error);
     return false;
}
}

function calculateAmountToSet(movementPercent,MaxmovementAmount,GLAmount)
{
try 
{
   var movementAmtOnPercent = ((movementPercent/100)*GLAmount);
   log.debug('DEBUG movementAmtOnPercent', movementAmtOnPercent);
   log.debug('DEBUG MaxmovementAmount', MaxmovementAmount);
   if(MaxmovementAmount == null){return movementAmtOnPercent;}
  
   if(movementAmtOnPercent < MaxmovementAmount)
   {
     return movementAmtOnPercent;
   }
   else if(movementAmtOnPercent > MaxmovementAmount)
   {
     return MaxmovementAmount;
   }
   else
   {
     return movementAmtOnPercent;
   }
} catch (error) {
 log.debug('DEBUG Error in calculateAmountToSet', error);
}
}
function errorManagement(rectype, recid, errorMessage,configurationType)
{
  try
    {
      //GL Posting is Not Success
      if(configurationType == "1")//Set Template Details in The Transaction
      {
        record.submitFields({type: rectype,id: recid,
          values: {
              'custbody_last_error_date': new Date(),
              'custbody_last_error_description': errorMessage,
              'custbody_powergl_template_name': null,
              'custbody_date_of_reposting': null,
              'custbody_gl_script_triggered': false
          }});
      }
      else if(configurationType == "2")//Set Template Details in the Custom Record	Set
      {
        var powergl_propertiesSearch = TransactionPropertiesSearch(recid)
        log.debug('DEBUG powergl_propertiesSearch',powergl_propertiesSearch);
        
        if(powergl_propertiesSearch.length > 0)
        {
          var powerGLPropID = powergl_propertiesSearch[0].id;
          log.debug('DEBUG powerGLPropID',powerGLPropID);
          record.submitFields({type: 'customrecord_powergl_properties',id: powerGLPropID,
              values: {
                          'custrecord_powergl_last_error_date': new Date(),
                          'custrecord_powergl_last_error_descript': errorMessage,
                          'custrecord_powergl_template': null,
                          'custrecord_powergl_date_of_reposting': null,
                      }});
         }
         else
         {
           var powerGLPropObj = record.create({type: 'customrecord_powergl_properties'});
           powerGLPropObj.setValue({fieldId: 'custrecord_powergl_parent_transaction',value: recid});
           powerGLPropObj.setValue({fieldId: 'custrecord_powergl_template',value: null});
           powerGLPropObj.setValue({fieldId: 'custrecord_powergl_date_of_reposting',value: null});
           powerGLPropObj.setValue({fieldId: 'custrecord_powergl_last_error_date',value: new Date()});
           powerGLPropObj.setValue({fieldId: 'custrecord_powergl_last_error_descript',value: errorMessage});
           var powerGLPropertyID = powerGLPropObj.save({enableSourcing: true,ignoreMandatoryFields: true})
           log.debug("powerGLPropertyID  ",powerGLPropertyID);
         }            
      }
    } catch (error) 
    {
        log.debug('DEBUG', 'Error in errorManagement', error);
    }
}
function getRecTypeID(rectype)
{   
  try 
  {
      var recTypeid;
      switch (rectype) 
      {
          case "assemblybuild":
              recTypeid = "34";
              break;
          case "assemblyunbuild":
              recTypeid = "35";
              break;
          case "vendorbill":
              recTypeid = "17";
              break;
          case "billccard":
              recTypeid = "19";
              break;
          case "billcredit":
              recTypeid = "20";
              break;
          case "billpayment":
              recTypeid = "18";
              break;
          case "binputawayworksheet":
              recTypeid = "42";
              break;
          case "bintransfer":
              recTypeid = "45";
              break;
          case "ccardrefund":
              recTypeid = "22";
              break;
          case "cashrefund":
              recTypeid = "29";
              break;
          case "cashsale":
              recTypeid = "5";
              break;
          case "check":
              recTypeid = "3";
              break;
          case "commission":
              recTypeid = "38";
              break;
          case "creditcard":
              recTypeid = "21";
              break;
          case "creditmemo":
              recTypeid = "10";
              break;
          case "currencyrevaluation":
              recTypeid = "36";
              break;
          case "customerdeposit":
              recTypeid = "40";
              break;
          case "customerrefund":
              recTypeid = "30";
              break;
          case "deposit":
              recTypeid = "4";
              break;
          case "depositapplication":
              recTypeid = "41";
              break;
          case "estimate":
              recTypeid = "6";
              break;
          case "expensereport":
              recTypeid = "28";
              break;
          case "inventoryadjustment":
              recTypeid = "11";
              break;
          case "inventorydistribution":
              recTypeid = "14";
              break;
          case "inventorytransfer":
              recTypeid = "12";
              break;
          case "inventoryworksheet":
              recTypeid = "13";
              break;
          case "inventorycostrevaluation":
              recTypeid = "51";
              break;
          case "invoice":
              recTypeid = "7";
              break;
          case "itemfulfillment":
              recTypeid = "32";
              break;
          case "itemreceipt":
              recTypeid = "16";
              break;
          case "journal":
              recTypeid = "1";
              break;
          case "liabilityadjustment":
              recTypeid = "27";
              break;
          case "opportunity":
              recTypeid = "37";
              break;
          case "paycheck":
              recTypeid = "24";
              break;
          case "payment":
              recTypeid = "9";
              break;
          case "payrolladjustment":
              recTypeid = "26";
              break;
          case "payrollliabilitycheck":
              recTypeid = "25";
              break;
          case "purchaseorder":
              recTypeid = "15";
              break;
          case "returnauthorization":
              recTypeid = "33";
              break;
          case "revenuecommitment":
              recTypeid = "46";
              break;
          case "revenuecommitmentreversal":
              recTypeid = "47";
              break;
          case "salesorder":
              recTypeid = "31";
              break;
          case "salestaxpayment":
              recTypeid = "23";
              break;
          case "statementcharge":
              recTypeid = "8";
              break;
          case "tegatareceivable":
              recTypeid = "49";
              break;
          case "tegatapayable":
              recTypeid = "50";
              break;
          case "taxliabilitycheque":
              recTypeid = "39";
              break;
          case "transfer":
              recTypeid = "2";
              break;
          case "transferorder":
              recTypeid = "48";
              break;
          case "vendorreturnauthorization":
              recTypeid = "43";
              break;
          case "workorder":
              recTypeid = "44";
              break;
      }
      return recTypeid;    
  } catch (error) 
  {
      log.debug('DEBUG Error in getRecTypeID', error);
  }
}

  return {
      customizeGlImpact: customizeGlImpact,
  }
});
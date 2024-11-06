/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 * @NModuleScope Public
 */
 define(['N/error','N/record','N/url','N/currentRecord','N/search','N/https','N/runtime'],
  function(error,record,url,currentRecord,search,https,runtime) {
 var createMode = true;
 var contextcopy = null;
      function pageInit(context)
         {
           contextcopy=context;
           var currentRecord = context.currentRecord;
           if(context.mode != "create" && context.mode != "copy")
           {
             createMode = false;
           }
 
           if(!createMode)
           {
             var TemplateNameField = currentRecord.getField({fieldId: 'custrecord_powergl_temp_template_name'});
             TemplateNameField.isDisabled = true;
 
             var TransactionTypeField = currentRecord.getField({fieldId: 'custrecord_powergl_temp_transaction_type'});
             TransactionTypeField.isDisabled = true;
 
             var RepostCriteriaField = currentRecord.getField({fieldId: 'custrecord_powergl_temp_reposting_crite'});
             RepostCriteriaField.isDisabled = true;
           }
         }
      function saveRecord(context)
         {
           try
             {
                 var currentRecord = context.currentRecord;
                 var TemplateName=currentRecord.getValue({fieldId:"custrecord_powergl_temp_template_name"})||null;
                 log.debug("TemplateName",TemplateName);
                 log.debug("createMode",createMode);
                 
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
 
                    if(PowerGLTemplateSrchResLen > 0 && createMode)
                    {
                      alert("Template Name Should be Unique!!")
                      return false;
                    }
                 }
               var numLines = currentRecord.getLineCount({sublistId : 'recmachcustrecord_powergl_account_parent'});
               //alert(numLines)
               if(numLines == 0)
               {
                 alert("Kindly enter the Account Details before saving the template")
                 return false;
               }
 
               //GL Account Lines Should Be Within 100%
                 var numLines = currentRecord.getLineCount({sublistId : 'recmachcustrecord_powergl_account_parent'});
                 const sumByAccount = {};
                 for (let lineNumber = 0; lineNumber < numLines; lineNumber++) 
                 {
                   var amount = currentRecord.getSublistValue({sublistId: "recmachcustrecord_powergl_account_parent",fieldId: "custrecord_power_gl_movement_amount",line: lineNumber})||0;
                   log.debug("amount",amount);
                   
                   var accountName = currentRecord.getSublistValue({sublistId: "recmachcustrecord_powergl_account_parent",fieldId: "custrecord_power_gl_source_account",line: lineNumber})    
                   var percentage = currentRecord.getSublistValue({sublistId: "recmachcustrecord_powergl_account_parent",fieldId: "custrecord_power_gl_percentage",line: lineNumber})               
                   if (sumByAccount[accountName] === undefined) 
                   {
                       sumByAccount[accountName] = parseFloat(percentage);
                       sumByAccount[accountName] = parseFloat(sumByAccount[accountName]).toFixed(2);
                       log.debug("sumByAccount[accountName] undefined",sumByAccount[accountName]);
                   } 
                   else 
                   {
                       sumByAccount[accountName] = parseFloat(sumByAccount[accountName]) + parseFloat(percentage);
                       sumByAccount[accountName] = sumByAccount[accountName].toFixed(2);
                       log.debug("sumByAccount[accountName] ",sumByAccount[accountName]);
                   }
                 }
                 log.debug("sumByAccount ",sumByAccount);
 
                 var keyForValueGreaterThan100 = null;
                 Object.entries(sumByAccount).some(([key, value]) => {
                 if (value > 100) 
                 {
                   keyForValueGreaterThan100 = key;
                   return true;  // Stop the iteration once a matching key is found
                }
                return false;});
 
                // Output the result
                if (keyForValueGreaterThan100 !== null) 
                {
                  var typesearchACC = search.lookupFields({
                  type: "account",
                  id: keyForValueGreaterThan100,
                  columns: ['displayname']})
                  var AccName = "";
                  try 
                  {
                    var AccName = typesearchACC.displayname;
                    log.debug("AccName",AccName)  
                  } catch (error) 
                  {
                    
                  }
                  alert("Total Percentage is Greater Than 100 For Account "+AccName+"");
                  return false;
                } 
               return true;
             }catch(e)
               {
                 alert("Error	"+e);
               }
           return true;
        }
      function validateField(context)
         {
         }
      function fieldChanged(context)
         {
         }
      function postSourcing(context)
         {
 
         }
      function lineInit(context)
         {
       }
      function validateDelete(context)
         {
 
         }
      function validateInsert(context)
         {
       }
      function validateLine(context)
         {
           try {
                 var currentRecord = context.currentRecord;
                 var sublistName = context.sublistId;
                 if(sublistName == "recmachcustrecord_powergl_account_parent")
                 {
                   var numLines = currentRecord.getLineCount({sublistId : 'recmachcustrecord_powergl_account_parent'});
                   var currentLinePercent = currentRecord.getCurrentSublistValue({sublistId: "recmachcustrecord_powergl_account_parent",fieldId: "custrecord_power_gl_percentage"});
                   //alert("currentLinePercent "+currentLinePercent);
                   var currentLineAmount = currentRecord.getCurrentSublistValue({sublistId: "recmachcustrecord_powergl_account_parent",fieldId: "custrecord_power_gl_movement_amount"});
                   if(currentLinePercent <= 0 || currentLinePercent > 100)
                   {
                       alert("Movement Percentage Should be Greater Than 0% and Less Than 100%");
                       return false;
                   }
                   if(currentLineAmount < 0)
                   {
                       alert("Maximum Movement Amount Should not be less than 0");
                       return false;
                   }
                 }
             return true;
           } catch (error) {
             alert("Error on Validate Line",error.message)
           }
         return true;
       }
      function sublistChanged(context)
         {
       }
      function triggerremoveALL()
        {
          try {
                 var currentRecord = contextcopy.currentRecord;
                 var numLines = currentRecord.getLineCount({sublistId : 'recmachcustrecord_powergl_account_parent'});
                 //alert(numLines)
 
                 for (let index = numLines-1; index >= 0; index--) {
                     currentRecord.removeLine({sublistId: 'recmachcustrecord_powergl_account_parent',line: index,})
                 }
          } catch (error) {
            alert("Error on Remove All Button Trigger "+error)
          }
        }
      function triggerremoveALLnotes() {
        try {
              var currentRecord = contextcopy.currentRecord;
              var numLines = currentRecord.getLineCount({sublistId : 'recmachcustrecord_user_note_parent'});
              //alert(numLines)
              for (let index = numLines-1; index >= 0; index--) 
              {
                currentRecord.removeLine({sublistId: 'recmachcustrecord_user_note_parent',line: index,})
              }
        } catch (error) {
          alert("Error on Remove All Notes Trigger "+error)
        }
      }
      function repostHistoricalGL(RepostCriteria,templateID)
        {
          try 
          {
              var filters=new Array();
          var columns=new Array();
              filters[0]=search.createFilter({name:"closed",operator:search.Operator.IS,values:false});
          columns[0]=search.createColumn({name:"startdate",sort: search.Sort.ASC});
 
              var FromActiveFinPeriod = "";
              try 
              {
                var ActvFinPeriodSrch=search.create({type:"accountingperiod",columns:columns,filters:filters});
                var ActvFinPeriodSrchRes=ActvFinPeriodSrch.run().getRange({start:0,end:1});
                log.debug("ActvFinPeriodSrchRes",ActvFinPeriodSrchRes);
                if(ActvFinPeriodSrchRes.length > 0)
                {
                  FromActiveFinPeriod = ActvFinPeriodSrchRes[0].getValue("startdate")
                }
              } catch (error) 
              {  
              }
              log.debug("FromActiveFinPeriod",FromActiveFinPeriod)
              var userConfirm = confirm("Reposting Historical Transactions GL will be done only for the active financial period i.e. from "+FromActiveFinPeriod+" date. Click Okay to continue.");
              log.debug("userConfirm",userConfirm);
              if(userConfirm)
              {
                log.debug("RepostCriteria",RepostCriteria);
                var backend_suitelet_url=url.resolveScript({scriptId: 'customscript_suitelet_powergl_templates',deploymentId: 'customdeploy_suitelet_powergl_templates'});
                // alert("backend_suitelet_url "+backend_suitelet_url);
                var response=https.get({url: backend_suitelet_url+="&custpage_repost_criteria="+RepostCriteria+"&custpage_template_id="+templateID}); 
                alert(response.body.toString())
                location.reload();
 
                var MRSearch = search.create({type: "mapreducescript",columns: [{name: 'scriptid'}],filters: [{name: 'name',operator: 'is',values: 'MR__PowerCloudGLTemplates'}]}).run();
                var MRSearchRes = MRSearch.getRange({start : 0,end : 1000});
                var MRSearchResresult=MRSearchRes[0];
                log.debug("MRSearchResresult",MRSearchResresult);
                var scriptID = MRSearchResresult.id;
                log.debug("scriptID",scriptID);
                window.open('https://'+runtime.accountId+'.app.netsuite.com/app/common/scripting/mapreducescriptstatus.nl?daterange=TODAY&scripttype='+scriptID+'&jobstatefilterselect=unfinished', '', 'width=800, height=800')
              }
              else
              {
                log.debug('User cancelled');
              }
           } catch (error) {
          alert("Error on repostHistoricalGL "+error)
        }
          
        }
       return {
              saveRecord:saveRecord,
                pageInit: pageInit,
                triggerremoveALL: triggerremoveALL,
                triggerremoveALLnotes: triggerremoveALLnotes,
                validateLine: validateLine, 
                repostHistoricalGL: repostHistoricalGL,
              };
 });
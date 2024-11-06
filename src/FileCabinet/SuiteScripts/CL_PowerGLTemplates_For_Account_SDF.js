/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 * @NModuleScope Public
 */
 define(['N/error','N/record','N/url','N/currentRecord','N/search','N/https'],
 function(error,record,url,currentRecord,search,https) {
var myWindow = null;
var contextcopy = null;
     function pageInit(context){
       try{

       } catch(e) {
              alert(e);
       }
     }
     function saveRecord(context)
        {
        try{
                var currentRecord = context.currentRecord;
              	var parentAccount=currentRecord.getValue({fieldId:"custrecord_powergl_account_parent"})||null;
                log.debug("parentAccount",parentAccount);
                var sourceAccount=currentRecord.getValue({fieldId:"custrecord_power_gl_source_account"})||null;
                log.debug("sourceAccount",sourceAccount);
                var currentPercentage=currentRecord.getValue({fieldId:"custrecord_power_gl_percentage"})||0;
                log.debug("currentPercentage",currentPercentage);

                var maxMovementAmt=currentRecord.getValue({fieldId:"custrecord_power_gl_movement_amount"})||0;
                log.debug("maxMovementAmt",maxMovementAmt);

                if(maxMovementAmt < 0)
                {
                      alert("Maximum Movement Amount Should not be less than 0");
                      return false;
                }
          
                var currentRecID = currentRecord.id||null;
                log.debug("currentRecID",currentRecID);
                if(parentAccount != null)
                {
                    var filters=new Array();
    		        var columns=new Array();
                    filters[0]=search.createFilter({name:"custrecord_powergl_account_parent",operator:search.Operator.ANYOF,values:parentAccount});
    		        filters[1]=search.createFilter({name:"custrecord_power_gl_source_account",operator:search.Operator.ANYOF,values:sourceAccount});
                    filters[2]=search.createFilter({name:"isinactive",operator:search.Operator.IS,values:false});
                    if(currentRecID != null)
                    {
                      log.debug("Comes")
                      filters[3]=search.createFilter({name:"internalid",operator:search.Operator.NONEOF,values:currentRecID});  
                    }
                    columns[0]=search.createColumn({name:"custrecord_power_gl_percentage"});
    		        var AccountSrch=search.create({type:"customrecord_powergl_account_details",columns:columns,filters:filters});

                    var AccountSrchRes=AccountSrch.run().getRange({start:0,end:1000});
                    log.debug("AccountSrchRes",AccountSrchRes);

                    var sumOfPercent = 0;
                    for(var i = 0; i < AccountSrchRes.length; i++)
                    {
                        var PercentAmount = AccountSrchRes[i].getValue("custrecord_power_gl_percentage")||0;
                        log.debug("PercentAmount",PercentAmount);
                        sumOfPercent = sumOfPercent + parseFloat(PercentAmount);
                    }//i

                    sumOfPercent = sumOfPercent + parseFloat(currentPercentage);
                    sumOfPercent = sumOfPercent.toFixed(2);
                    log.debug("sumOfPercent",sumOfPercent);
                    
                    if(sumOfPercent > 100 || sumOfPercent <= 0 || currentPercentage <= 0)
                    {
                        alert("Movement Percentage Should be Greater Than 0% and Less Than 100%");
                        return false;
                    }
                  return true;
                }
              return true;
            }catch(e)
            {
                log.debug("Error on saveRecord",e);
            }
          return true;
       }
     function validateField(context)
        {
        }
     function fieldChanged(context) {
       try{

       }catch(e) {
         log.debug(e);
         alert(e);
       }
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
      }
     function sublistChanged(context)
        {
      }
      return {
               saveRecord: saveRecord
             };
});
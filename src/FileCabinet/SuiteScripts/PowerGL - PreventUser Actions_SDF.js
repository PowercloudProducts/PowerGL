/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record','N/search','N/error','N/ui/serverWidget','N/runtime'], function(record,search,error,serverWidget,runtime) {
  function beforeLoad(context) {
    try{
    }catch(e)
    {
      log.debug("Error",e);
    }
  }

  function beforeSubmit(context) 
  {
    var recordType = context.newRecord.type;
    log.debug("recordType ",recordType);

    log.debug("runtime.executionContext ",runtime.executionContext);
    if(recordType == "customrecord_powergl_properties")
    {
      if (context.type == context.UserEventType.EDIT && runtime.executionContext == "USERINTERFACE")
      {
        throw("Error: Edit is not allowed");
      }
    }
    else
    {
      if (context.type == context.UserEventType.DELETE) 
      {            
        throw("Error: Deletion not allowed");
      }
      if (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.COPY) 
      {            
        throw("Error: Create/Copy is not allowed");
      } 
    }
  }
  return {
    beforeSubmit: beforeSubmit,
    //afterSubmit: afterSubmit
  }
});

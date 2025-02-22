var _ = require('underscore');
var Backbone = require('backbone');
var $ = require('jquery');

var AdminCommunityFormTemplate = require('../templates/admin_community_form_template.html');
var AdminCommunityAddBureauOfficeTemplate = require('../templates/admin_community_add_bureau_office_template.html');
var AdminCommunityBureauAndOfficeFormTemplate = require('../templates/admin_community_bureau_and_office_form_template.html');
var AdminCommunityBureauOfficeMessageTemplate = require('../templates/add_community_bureau_office_message_template.html');
var CommunityModel = require('../../../entities/community/community_model');
var ModalComponent = require('../../../components/modal');
var Modal = require('../../../components/modal');

var AdminCommunityEditView = Backbone.View.extend({

  events: {
    'click #community-edit-cancel': 'cancel',
    'click #community-edit-save'  : 'save',
    'blur .validate'     : 'validateField',
    'change .validate'   : 'validateField',
    'click #add-bureau-office':'addbureauOfficeDisplay',
    'click .edit-bureau-office':'addbureauOfficeDisplay',
    'click .delete-bureau' :'deleteBureau',
    'click .delete-office' :'deleteOffice',
    
   
  },

  initialize: function (options) {
    this.options = options; 
    this.departments={};  
    this.communityInfo={};
    this.bureaus                = [];
    this.params = new URLSearchParams(window.location.search);   
    return this;
  },

  render: function () {
    $('#search-results-loading').show();
    this.initializeBureaus(); 
    this.initializeAgencySelect();
    this.loadDepartments();  
    if(this.options.communityId){
      this.loadCommunity(); 
           
    }
    else{
      var data = {
        communityId: '', 
        departments : this.departments,         
      };   
        
      this.$el.html(_.template(AdminCommunityFormTemplate)(data));   
      this.$el.localize(); 
      this.initializeCounts();
      $('#search-results-loading').hide();   
    }
    return this;
  },
 
  loadDepartments: function (){ 
    $.ajax({
      url: '/api/admin/community/agencies',  
      type: 'GET',
      async: false,
      success: function (data){         
        this.departments= data;       
      }.bind(this),
    });
  },

  initializeAgencySelect: function () {
    setTimeout(function () {
      $('#agencies').select2({
        placeholder: 'Select an agency',
        allowClear: true,
      });
      try {
        $('#s2id_agencies').children('.select2-choice').children('.select2-search-choice-close').remove();
      } catch (error) { /* swallow exception because close image has already been removed*/ }
    }, 50);
  },

  initializeListeners: function () {
    this.listenTo(this.community, 'community:save:success', function () {
      Backbone.history.navigate('/admin/community/' + this.options.communityId + '?updateSuccess', { trigger: true });
    }.bind(this));
    this.listenTo(this.community, 'community:save:error', function () {
      $('#community-save-error').show();
      $('#community-save-error').get(0).scrollIntoView();
    });
  },

  initializeformFields: function (community){  
    $('#communityType option:contains('+ community.communityType +')').attr('selected', true);
    $('#targetAudience option:contains('+ community.targetAudience +')').attr('selected', true);
    $('#duration option:contains('+ community.duration +')').attr('selected', true);
    $('#agencies').val(community.agency.agencyId); 
    $('input[name=community-group][value=' + community.isClosedGroup +']').prop('checked', true);
    $('#community-name').val(community.communityName);
    $('#description').val(community.description);
    $('#community-support-email').val(community.supportEmail);
    $('#application-process').val(community.applicationProcess);
    $('#microsite-url').val(community.micrositeUrl);
    $('#community-mgr-name').val(community.communityManagerName);
    $('#community-mgr-email').val(community.communityManagerEmail);
  },

  getDataFromPage: function (){
    var modelData = {
      communityId: this.options ? this.options.communityId: null,
      communityType: $('#communityType').val(),
      targetAudience:$('#targetAudience').val(),
      duration :$('#duration').val(),
      agencyId  : $('#agencies').val(),
      isClosedGroup: $("input[name='community-group']:checked").val(),            
      communityName: $('#community-name').val(),
      description: $('#description').val(),
      supportEmail: $('#community-support-email').val(),
      applicationProcess:$('#application-process').val(),
      micrositeUrl: $('#microsite-url').val(),
      communityManagerName: $('#community-mgr-name').val(),
      communityManagerEmail: $('#community-mgr-email').val(),
    };
    return modelData;
  },
  loadCommunity: function () {
    $.ajax({
      url: '/api/admin/community/' + this.options.communityId,
      dataType: 'json',
      success: function (community) {      
        this.community = new CommunityModel(community);      
        community.departments=this.departments;     
        this.$el.html(_.template(AdminCommunityFormTemplate)(community));

        if(community.referenceId=='dos'){
          this.renderBureausAndOffices();
        }
        this.$el.show();
        this.initializeListeners();
        this.initializeCounts();
        this.initializeAgencySelect();    
        this.initializeformFields(community);
        $('#search-results-loading').hide();
       
      }.bind(this),
      error: function () {
        $('#search-results-loading').hide();
        showWhoopsPage();
      },
    });
  },

  renderBureausAndOffices: function () {
    var bureauOfficeTemplate = _.template(AdminCommunityBureauAndOfficeFormTemplate)({
      bureaus: this.bureaus,
      communityId:this.options.communityId,     
    });
    $('#bureau-office').html(bureauOfficeTemplate);
  },
  
  renderBureausOfficesMessages: function (data,self) { 
    var bureauOfficeMessageTemplate = _.template(AdminCommunityBureauOfficeMessageTemplate)({
      updateOffice:data.updateOffice,
      updateBureau:data.updateBureau,
      name:data.name,
      insertBureau:data.insertBureau,
      insertOffice:data.insertOffice,
      deleteBureau: data.deleteBureau,
      deleteOffice: data.deleteOffice,
     
    });
   
    $('#bureau-office-message').html(bureauOfficeMessageTemplate);
    window.scrollTo(0, 0);
  },

  initializeCounts: function () {
    [{ id: 'community-name', count: 100},{ id: 'community-new-office', count: 100},{ id: 'community-new-bureau', count: 100}, { id: 'description', count: 500}].forEach(function (item) {
      $('#' + item.id).charCounter(item.count, { container: '#' + item.id + '-count' });
    });
  },

  validateField: function (e) {
    return validate(e);
  },

  validateFields: function () {
    return _.reduce(this.$el.find('.validate'), function (abort, child) {
      return validate({ currentTarget: child }) || abort;
    }, false);
  },

  cancel: function (e) {
    e.preventDefault && e.preventDefault();
    window.history.back();
  },

  save: function (e) {
    e.preventDefault && e.preventDefault(); 
    var data= this.getDataFromPage();
    if(this.options.communityId){
      data.updatedAt=$('#updated-at').val();
    }  
    if(this.validateFields()) {
      $('.usa-input-error').get(0).scrollIntoView();
    } else {
      $('#community-save-error').hide();
      if(this.options.communityId){
        this.community.trigger('community:save', data);
      }
      else{
        this.saveCommunity();
      }
    }
  },

  saveCommunity:function (){
    var data= this.getDataFromPage();
    $.ajax({
      url: '/api/community',
      type: 'POST',
      data: data,
      success: function (community) {
        Backbone.history.navigate('/admin/community/' + community.communityId + '?saveSuccess', { trigger: true });
      }.bind(this),
      error: function (err) {
        $('#community-save-error').show();
        $('#community-save-error').get(0).scrollIntoView();      
      }.bind(this),
    });
  },
  validatebureau: function (){
    var abort = false; 
    var selectedBureauValue= $('#community_tag_bureau').val();
    var selectedValue=  $('input[name=community-bureau-office-group]:checked').val();
    if(selectedBureauValue =='' && selectedValue=='office') {
      $('#community_drop_bureau').addClass('usa-input-error');     
      $('#community_drop_bureau>.field-validation-error').show();
      abort=true;
    }
    else{
      $('#community_drop_bureau').removeClass('usa-input-error');     
      $('#community_drop_bureau>.field-validation-error').hide();
      abort=false;
    }
    if(abort) {
      $('.usa-input-error').get(0).scrollIntoView();
    } 
    return abort;
  },

  validatebureauOffice: function (bureauId,officeId) {

    var selectedValue=  $('input[name=community-bureau-office-group]:checked').val();
    var bureauValue=$('#community-new-bureau').val();
    var officeValue= $('#community-new-office').val();
    var selectedBureauValue= $('#community_tag_bureau').val();  
    var abort = false; 
    if((officeValue=='' && bureauId && officeId) || ( selectedValue=='office')){
      if(selectedBureauValue =='') {
        $('#community_drop_bureau').addClass('usa-input-error');     
        $('#community_drop_bureau>.field-validation-error').show();
        abort=true;
      }
      else{
        $('#community_drop_bureau').removeClass('usa-input-error');     
        $('#community_drop_bureau>.field-validation-error').hide();
        abort=false;
      }
      if(officeValue==''){
        $('#community-office-name').addClass('usa-input-error');     
        $('#community-office-name>.field-validation-error').show();
        $('#community-office-name>.exist-validation-error').hide();
        abort=true;
      }
      else{
        $('#community-office-name').removeClass('usa-input-error');     
        $('#community-office-name>.field-validation-error').hide();
        $('#community-office-name>.exist-validation-error').hide();
        abort=false;
      }
    }
    else if((bureauValue=='' && bureauId) || (selectedValue=='bureau' && bureauValue=='')){
      $('#community-bureau-name').addClass('usa-input-error');     
      $('#community-bureau-name>.field-validation-error').show();
      $('#community-bureau-name>.exist-validation-error').hide();
      abort=true;
    } 
    else{
      $('#community-bureau-name').removeClass('usa-input-error');     
      $('#community-bureau-name>.field-validation-error').hide();   
      $('#community-office-name').removeClass('usa-input-error');     
      $('#community-office-name>.field-validation-error').hide();
      $('#community_drop_bureau').removeClass('usa-input-error');     
      $('#community_drop_bureau>.field-validation-error').hide();
      abort=false;
    }

    if(abort) {
      $('.usa-input-error').get(0).scrollIntoView();
    }  
    return abort;
  },

  addbureauOfficeDisplay:function (event){ 
    event.preventDefault && event.preventDefault(); 
    var bureauId= $(event.currentTarget ).data('bureau-id');
    var bureauName=$(event.currentTarget ).data('bureau-title');
    var officeId=$(event.currentTarget ).data('office-id');
    var officeName=$(event.currentTarget ).data('office-title');
    
    var self = this;
    self.initializeBureaus();  
    
    if (this.modalComponent) { this.modalComponent.cleanup(); } 
    var communityId= this.options.communityId; 
  
    var data = {  
      bureaus: this.bureaus,  
      bureauName:bureauName, 
      bureauId:bureauId,
      officeId:officeId,
      officeName:officeName,
    }; 
   
    var modalContent = _.template(AdminCommunityAddBureauOfficeTemplate)(data); 
   
    var bureauOfficeData;   
    var modalTitle;
    if(bureauId && officeId){
      modalTitle ='Edit office/post';
    }
    else if(bureauId){
      modalTitle='Edit bureau';
    }
    else{
      modalTitle='Add new bureau or office/post';
    }
     
    self.modalComponent = new ModalComponent({         
      el: '#site-modal',
      id: 'add-bureau-office',
      modalTitle:  modalTitle,
      modalBody: modalContent,  
      action: function (){    
      } ,     
      secondary: {
        text: 'Cancel',
        action: function () {          
          self.modalComponent.cleanup();    
        }.bind(this),
      },
      primary: {
        text:  bureauId || officeId ?'Save':'Add',
        action: function () {
          var selectedValue=  $('input[name=community-bureau-office-group]:checked').val();
          if(!self.validatebureauOffice(bureauId,officeId) && !self.checkBureauOfficeExist(self,bureauId,officeId,bureauName,officeName)){
            if(bureauId && officeId){
              bureauOfficeData={
                bureauId:bureauId,
                officeId :officeId,
                name: $('#community-new-office').val(),
              };    
            }
            else if(bureauId){
              bureauOfficeData={
                bureauId:  bureauId,   
                name: $('#community-new-bureau').val(),
              };
            }
            else if(selectedValue=='bureau'){
              bureauOfficeData={
                name: $('#community-new-bureau').val(),
                selected: selectedValue,
              };
            } 
            else if(selectedValue=='office'){
              bureauOfficeData={
                bureauId:$('#community_tag_bureau').val(),
                name: $('#community-new-office').val(),
                selected: selectedValue,
              };
            }  

            $.ajax({
              url: '/api/admin/community/'+ communityId +'/bureau-office',
              method: 'PUT',
              data:bureauOfficeData,        
            }).done(function (data) {                    
              var index = _.findIndex(self.bureaus, { bureauId: data.bureauId });          
              if(data.bureauId && data.officeId){
                var indexOffice = _.findIndex(self.bureaus[index].offices, { id: data.officeId });
               
                if(indexOffice==-1){
                  var OfficeData={
                    id:data.officeId,
                    text : data.name,
                    name: data.name,
                  };
                  self.bureaus[index].offices.push(OfficeData);                                              
                }
                else {
                  self.bureaus[index].offices[indexOffice].name = data.name;            
                }
                self.bureaus[index].offices= _.sortBy(self.bureaus[index].offices, function (o){
                  return o.name.toLowerCase();
                });
              }
              else{
                if (index == -1) {
                  self.bureaus.push(data);
             
                } else {
                  self.bureaus[index].name = data.name;
                } 
                self.bureaus= _.sortBy(self.bureaus, function (b){
                  return b.name.toLowerCase();
                });
              }           
              self.renderBureausAndOffices(self.bureaus);
              self.renderBureausOfficesMessages(data,self);         
              self.modalComponent.cleanup();
            }.bind(this)).fail(function () {
              self.modalComponent.cleanup();
            }.bind(this));
          }
          // eslint-disable-next-line no-empty
          else{
            
          }  
        },
      },      
    }).render();  
    self.initializeCounts();
    self.changebureau(bureauId,officeId);

    $('input[name=community-bureau-office-group]').on('change', function (e) {       
      self.changebureau(bureauId,officeId);    
    }.bind(this));

    $('.validate').on('blur', function (e) {
      self.validatebureauOffice(bureauId,officeId);       
    }.bind(this));

    $('.validate').on('change', function (e) {
      self.validatebureau();      
    }.bind(this));

    self.initializeSelect2();
    
    //adding this to show select2 data in modal
    $('.select2-drop, .select2-drop-mask').css('z-index', '99999');
  },
  checkBureauOfficeExist:function (self,bureauId,officeId,targetBureauName,targetOfficeName){  
    var abort= false;
    var selectedValue=  $('input[name=community-bureau-office-group]:checked').val();
    var bureauName=$('#community-new-bureau').val();
    var officeName=$('#community-new-office').val();
    var newbureauId= $('#community_tag_bureau').val();
   
    if(bureauId && officeId && officeName || selectedValue=='office'){
     
      var index = newbureauId ? _.findIndex(self.bureaus, { bureauId:newbureauId }):_.findIndex(self.bureaus, { bureauId:bureauId ? bureauId.toString():'' });   
      var indexOfficeName='';
      if(targetOfficeName){
        var updatedOfficeArray = _.reject(self.bureaus[index].offices, function (o) { 
          return o.name.replace(/\s/g, '').toLowerCase()==targetOfficeName.replace(/\s/g, '').toLowerCase(); 
        }); 
        indexOfficeName = _.findIndex(updatedOfficeArray, function (o){
          return o.name.replace(/\s/g, '').toLowerCase() == officeName.replace(/\s/g, '').toLowerCase();
        });
      }
      else{
        indexOfficeName = _.findIndex(self.bureaus[index].offices, function (o){
          return o.name.replace(/\s/g, '').toLowerCase() == officeName.replace(/\s/g, '').toLowerCase();
        });
      }
      if(indexOfficeName!==-1){
        $('#community-office-name').addClass('usa-input-error');     
        $('#community-office-name>.exist-validation-error').show();
        abort=true;
      }
      else{
        $('#community-office-name').removeClass('usa-input-error');     
        $('#community-office-name>.exist-validation-error').hide();
        abort= false;
      }  
    }
    else if(bureauId && bureauName || selectedValue=='bureau'){
      var indexBureauName='';
      if(targetBureauName){
        var updatedBureauArray = _.reject(self.bureaus, function (b) { 
          return b.name.replace(/\s/g, '').toLowerCase()==targetBureauName.replace(/\s/g, '').toLowerCase(); 
        }); 
        indexBureauName = _.findIndex(updatedBureauArray, function (b) {
          return b.name.replace(/\s/g, '').toLowerCase() == bureauName.replace(/\s/g, '').toLowerCase();
        });
      }
      else{
        indexBureauName = _.findIndex(self.bureaus, function (b) {
          return b.name.replace(/\s/g, '').toLowerCase() == bureauName.replace(/\s/g, '').toLowerCase();
        });
      }
    
      if(indexBureauName!==-1){
        $('#community-bureau-name').addClass('usa-input-error');     
        $('#community-bureau-name>.exist-validation-error').show();
        abort=true;
      }
      else{
        $('#community-bureau-name').removeClass('usa-input-error');     
        $('#community-bureau-name>.exist-validation-error').hide();
        abort=false;
      }  
    }
    return abort;
  },

  changebureau: function (bureauId,officeId){ 
    if(bureauId && officeId){
      $('.bureau-section').hide();
      $('.bureau-office-section').show();
    }
    else if(bureauId){
      $('.bureau-section').show();
      $('.bureau-office-section').hide();
    }
    else if( $('input[name=community-bureau-office-group]:checked').val()=='bureau'){
      $('.bureau-section').show();
      $('.bureau-office-section').hide();   
    }
    else if( $('input[name=community-bureau-office-group]:checked').val()=='office'){
      $('.bureau-section').hide(); 
      $('.bureau-office-section').show();
     
    }
    // eslint-disable-next-line no-empty
    else{    
    }
   
  },
  deleteBureau: function (event) {
    var data ={
      bureauId:$(event.currentTarget ).data('bureau-id'),
      bureauName:$(event.currentTarget ).data('bureau-title'),
      officeId:$(event.currentTarget ).data('office-id'),
      officeName:$(event.currentTarget ).data('office-title'),
    };
    var communityId= this.options.communityId;
    var deleteModal = new Modal({
      id: 'confirm-deletion',
      alert: 'error',
      action: 'delete',
      modalTitle: 'Confirm delete bureau or office/post',
      modalBody: 'Are you sure you want to delete <strong>' + data.bureauName + '</strong>? <strong>If you delete the bureau, you will also delete all of its offices and posts</strong>.',
      primary: {
        text: 'Delete',
        action: function () {
          this.submitDelete.bind(this)(data, deleteModal,communityId);
        }.bind(this),
      },
    });
    deleteModal.render();
  },

  submitDelete: function (data, deleteModal,communityId) {  
    $.ajax({
      url: '/api/admin/community/'+ communityId +'/bureau/'+ data.bureauId,
      type: 'DELETE',    
    }).done(function (data) {
      deleteModal.cleanup();
      
      this.bureaus= _.reject(this.bureaus,function (b){
        return b.bureauId== data.bureauId;
      });   
      this.renderBureausAndOffices(this.bureaus);
      this.renderBureausOfficesMessages(data,this);  
    }.bind(this)).fail(function (error) {
      deleteModal.displayError('There was an error attempting to delete this bureau.', 'Error Deleting');
    }.bind(this));
  },
  

  deleteOffice: function (event) {
    var data ={
      bureauId:$(event.currentTarget ).data('bureau-id'),
      bureauName:$(event.currentTarget ).data('bureau-title'),
      officeId:$(event.currentTarget ).data('office-id'),
      officeName:$(event.currentTarget ).data('office-title'),
    };
    var communityId= this.options.communityId;
    var deleteModal = new Modal({
      id: 'confirm-office-deletion',
      alert: 'error',
      action: 'delete',
      modalTitle: 'Confirm delete office/post',
      modalBody: 'Are you sure you want to delete <strong>' + data.officeName + '</strong>? <strong> This cannot be undone</strong>.',
      primary: {
        text: 'Delete',
        action: function () {
          this.submitOfficeDelete.bind(this)(data, deleteModal,communityId);
        }.bind(this),
      },
    });
    deleteModal.render();
  },

  submitOfficeDelete: function (data, deleteModal,communityId) {
   
    $.ajax({
      url: '/api/admin/community/'+ communityId +'/bureau/'+ data.bureauId + '/office/' + data.officeId,
      type: 'DELETE',    
    }).done(function (data) {   
      deleteModal.cleanup();
      var index=  _.findIndex(this.bureaus, { bureauId:data.bureauId });
      this.bureaus[index].offices= _.reject(this.bureaus[index].offices,function (o){
        return o.id== data.officeId;
      }); 
      this.renderBureausAndOffices(this.bureaus);
      this.renderBureausOfficesMessages(data,this);  
    }.bind(this)).fail(function (error) {
      deleteModal.displayError('There was an error attempting to delete this bureau.', 'Error Deleting');
    }.bind(this));
  },

  initializeBureaus: function () {
    $.ajax({
      url: '/api/enumerations/bureaus', 
      type: 'GET',
      async: false,
      success: function (data) {             
        this.bureaus = _.sortBy(data, function (b){
          return b.name.toLowerCase();
        });
      }.bind(this),
    });
  },

  initializeSelect2: function () {
    $('#community_tag_bureau').select2({
      placeholder: 'Select a bureau',  
      allowClear: true,
      width:'100%',  
    });  
  },

  cleanup: function () {
    removeView(this);
  },

});

module.exports = AdminCommunityEditView;
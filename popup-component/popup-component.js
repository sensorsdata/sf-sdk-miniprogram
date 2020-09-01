var sensors = getApp().sensors;
Component({
  options: {
    multipleSlots: true, // 在组件定义时的选项中启用多slot支持
  },
  ready: function () {},
  lifetimes: {
    attached: function () {
      this.subscribe();
    },
  },
  /**
   * 组件的属性列表
   */
  properties: {},

  /**
   * 组件的初始数据
   */
  data: {
    flag: true,
    isShow: false,
    template: {},
    image_list: [],
    image_load: {},
    msg: {
      $sf_msg_title: '',
      $sf_msg_content: '',
      $sf_msg_image_url: '',
      $sf_succeed: '',
      $sf_fail_reason: '',
      $sf_msg_id: '',
      plan: {},
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    subscribe: function () {
      sensors.popupEmitter.sub = [];
      sensors.popupEmitter.add(this);
    },
    loadImage: function (list) {
      if (!!list && list.length > 0) {
        var image_arr = [].concat(this.image_list, list);
        this.setData({ image_list: image_arr });
      }
    },
    handle: function (data) {
      var that = this;
      if (!that.data.flag) {
        return;
      }
      if (!data.popupTree && !data.properties) {
        that.popupFail(1001);
        return false;
      }
      that.initMessage(data);
      that.setData({ template: data.popupTree });
      that.setData({ image_load: {} });
      var is_control_group = data.msg.is_control_group;
      if (!is_control_group && that.data.flag) {
        that.setData({ isShow: true });
        if (!that.needLoadimageFirst()) {
          that.showPopup();
        } else {
          that.loadimageFirst();
        }
      } else {
        that.popupFail(2000);
      }
    },
    initMessage(data) {
      var popup_tree = data.popupTree;
      var msg = {
        $sf_msg_id: data.msg.uuid,
      };
      msg.$sf_msg_title = popup_tree.title ? popup_tree.title.innerText : '';
      msg.$sf_msg_content = popup_tree.content
        ? popup_tree.content.innerText
        : '';
      msg.$sf_msg_image_url = popup_tree.img ? popup_tree.img.src : '';
      msg.plan_id = (data.msg.plan && data.msg.plan.plan_id) || '';
      msg.$sf_audience_id = (data.msg.plan && data.msg.plan.audience_id) || '';
      msg.is_control_group = data.msg.is_control_group;
      this.setData({ msg: msg });
    },

    popupFail(fail_code) {
      var ERROR_CODE = {
        1000: '图片加载失败',
        1001: '预览信息解析失败，请检查计划配置',
        2000: '对照组',
      };
      var prop = Object.assign({}, this.data.msg);
      prop.$sf_succeed = false;
      prop.fail_code = fail_code;
      prop.$sf_fail_reason = ERROR_CODE[fail_code];
      prop.is_control_group = this.data.msg.is_control_group;

      if (fail_code !== 2000) {
        sensors.events.emit('popup_load_fail', prop);
      } else {
        sensors.events.emit('group_popup_display', prop);
      }
    },

    // 点击遮罩层
    clickMask: function () {
      if (this.data.template.properties.maskCloseEnabled) {
        var msg = Object.assign({}, this.data.msg);
        msg.$sf_msg_action_id = this.data.template.properties.maskActionId;
        msg.$sf_close_type = 'POPUP_CLOSE_MASK';
        msg.$sf_msg_element_type = 'mask';
        msg.is_control_group = this.data.msg.is_control_group;
        sensors.events.emit('popup_click', msg);
        this.hidePopup();
      }
    },
    //隐藏弹框
    hidePopup: function () {
      this.setData({ flag: true });
      this.setData({ isShow: false });
    },
    //展示弹框
    showPopup() {
      if (this.data.msg.is_control_group) {
        return false;
      }
      this.setData({ flag: false });
      var msg = Object.assign({}, this.data.msg);
      msg.$sf_succeed = true;
      msg.is_control_group = this.data.msg.is_control_group;
      sensors.events.emit('popup_display', msg);
    },

    tapContent() {
      console.log('点击了弹窗窗体');
    },

    topCloseButton() {
      var image_button = this.data.template.image_button;
      if (!image_button.$sf_close_type) {
        image_button.$sf_close_type = 'POPUP_CLOSE_TOPRIGHT';
      }
      this.popupCLick(image_button);
    },
    buttomCloseButton() {
      var image_button = this.data.template.image_button;
      if (!image_button.$sf_close_type) {
        image_button.$sf_close_type = 'POPUP_CLOSE_BOTTOM';
      }
      this.popupCLick(image_button);
    },
    clickImage() {
      var image = this.data.template.img;
      if (!image.$sf_close_type) {
        image.$sf_close_type = 'POPUP_CLOSE_BUTTON';
      }
      this.popupCLick(image);
    },
    buttonFirst() {
      var button = this.data.template.button[0];
      if (button.action_type === 'close' && !button.$sf_close_type) {
        button.$sf_close_type = 'POPUP_CLOSE_BUTTON';
      }
      this.popupCLick(button);
    },
    buttonSecond() {
      var button = this.data.template.button[1];

      if (button.action_type === 'close' && !button.$sf_close_type) {
        button.$sf_close_type = 'POPUP_CLOSE_BUTTON';
      }
      this.popupCLick(button);
    },
    popupCLick(obj) {
      var prop = Object.assign({}, this.data.msg);
      prop.$sf_msg_element_type = obj.type;
      prop.$sf_msg_element_content = obj.innerText;
      prop.$sf_msg_action_id = obj.id;
      prop.action_value = obj.value;
      prop.$sf_msg_element_action = obj.action_type;
      prop.$sf_close_type = obj.$sf_close_type;
      prop.is_control_group = this.data.msg.is_control_group;

      switch (obj.action_type) {
        case 'copy':
          wx.setClipboardData({
            data: obj.value,
            success(res) {
              console.log('复制文本成功'); // data
            },
          });
          break;

        case 'navigateTo':
          prop.action_value = {
            path: obj.path,
          };
          this.navigatePage(prop.action_value);
          break;

        case 'navigateToMiniProgram':
          prop.action_value = {
            path: obj.path,
            appid: obj.appid,
          };
          this.navigateMini(prop.action_value);
          break;
      }

      sensors.events.emit('popup_click', prop);

      if (obj.closeable) {
        this.hidePopup();
      }
    },
    navigatePage(param) {
      wx.navigateTo({
        url: param.path,
        success: function () {
          console.log('navigate success');
        },
        fail: function (res) {
          console.log('navigate fail: ', res);
        },
      });
    },
    navigateMini(param) {
      wx.navigateToMiniProgram({
        appId: param.appid,
        path: param.path,
        success() {
          console.log('navigate success');
        },
        fail(err) {
          console.log('navigate fail： ', err);
        },
      });
    },
    needLoadimageFirst() {
      if (
        this.data.template.img ||
        this.isExistImageButton() ||
        (this.data.template.image_button &&
          !this.data.template.image_button.useLocalImage)
      ) {
        return true;
      } else {
        return false;
      }
    },
    isExistImageButton() {
      if (!this.data.template.button || this.data.template.button.length < 1) {
        return false;
      }
      var button = this.data.template.button;
      for (var item in button) {
        if (button[item].type === 'image_button') {
          return true;
        }
      }
    },
    loadimageFirst() {
      if (this.data.template.img) {
        this.setData({ 'image_load.image': 0 });
      }
      if (this.data.template.image_button) {
        if (!this.data.template.image_button.useLocalImage) {
          this.setData({ 'image_load.image_button': 0 });
        }
      }
      if (this.data.template.button && this.data.template.button.length > 0) {
        var button = this.data.template.button;
        for (var temp in button) {
          if (button[temp].type === 'image_button') {
            if (temp == 0) {
              this.setData({ 'image_load.first_button': 0 });
            } else if (temp == 1) {
              this.setData({ 'image_load.second_button': 0 });
            }
          }
        }
      }
    },

    image() {
      this.setData({ 'image_load.image': 1 });
      this.checkLoad();
    },
    imageError(err) {
      console.log('load image error: ', err.detail);
      this.setData({ 'image_load.image': 2 });
      this.checkLoad();
    },
    firstButton() {
      this.setData({ 'image_load.first_button': 1 });
      this.checkLoad();
    },
    firstButtonError(err) {
      console.log('load button error: ', err.detail);
      this.setData({ 'mage_load.first_button': 2 });
      this.checkLoad();
    },
    secondButton() {
      this.setData({ 'image_load.second_button': 1 });
      this.checkLoad();
    },
    secondButtonError(err) {
      console.log('load button error: ', err.detail);
      this.setData({ 'mage_load.first_button': 2 });
      this.checkLoad();
    },
    imageButton() {
      this.setData({ 'image_load.image_button': 1 });
      this.checkLoad();
    },
    imageButtonError(err) {
      console.log('load  button error: ', err.detail);
      this.setData({ 'mage_load.image_button': 2 });
      this.checkLoad();
    },

    checkLoad() {
      var load_success = true,
        load_all = true;
      var loadObj = this.data.image_load;
      for (var tem in loadObj) {
        if (loadObj[tem] === 0) {
          load_all = false;
        } else if (loadObj[tem] === 2) {
          load_success = false;
        }
      }
      if (load_all && load_success) {
        this.showPopup();
      }
      if (load_all && !load_success) {
        this.popupFail(1000);
      }
    },
  },
});

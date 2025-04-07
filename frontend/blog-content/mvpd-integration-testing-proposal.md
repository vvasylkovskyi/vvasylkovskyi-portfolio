# MVPD Integration Testing Proposal: A Proactive Approach for Engineering Excellence

![Alt text](./mvpd-integration-testing-proposal/ci-integration.png)

## Summary

This proposal outlines a strategic approach to address the growing challenge of supporting an increasing variety of devices and MVPDs at Peacock. As the number of supported devices outpaces the engineering resources, we propose the development of a standardized, generic device for efficient and effective integration testing. This device, based on the Raspberry Pi hardware with a tailored software stack, will serve as a reliable reference for quality assurance and enable more streamlined and cost-effective testing processes.

## Introduction

The expanding array of partner devices and platforms associated with Peacock presents a significant challenge in maintaining a high standard of support. The current approach, where the number of devices to be supported is outstripping our engineering capacity, is unsustainable and necessitates a proactive solution. To continue delivering exceptional service and maintain our competitive edge, it is imperative to adopt a proactive strategy that ensures engineering excellence without overburdening our resources.

## Motivation

Our experiences with onboarded devices reveal a commonality in their underlying software stacks. By leveraging this insight, we can streamline our testing processes, ensuring both quality and efficiency.

## Goals

The primary goal is to build an [RDK](https://rdkcentral.com) and [WPE](https://wpewebkit.org/) based device, integrating it with the CVSDK CI for automated testing. This will serve as a cost-effective and scalable solution for quality assurance across numerous devices. Additionally, the new device will serve a reference for minimum hardware requirements for the future MVPDs that share same software stack.

## Solution Proposal

### Hardware Acquisition: Raspberry Pi

- **Rationale for Selection**: Comparative analysis with the [KPN Device](https://wiki.inbcu.com/download/attachments/623054444/VIP5202.pdf?version=1&modificationDate=1696865189224&api=v2) demonstrates that the following models should be selected:
  - [Raspberry Pi 4 Model B](https://www.raspberrypi.com/products/raspberry-pi-4-model-b/) closely mirrors the required hardware specifications, making it an ideal choice for our purposes. Though some of the RDK OS Images lack support to this model, which leads us to the next best choice.
  - [Raspberry Pi 3 Model B](https://www.raspberrypi.com/products/raspberry-pi-3-model-b/) has wide support of RDK making it ideal from software perspective. The model is also one of the high ends in RPI worlds and resembless hardware specifications close to our MVPDs.

The choice is based on the following hardware capabilities:

- **DMIPs**: 8500
- **RAM**: 2G
- **SoC**: BCM 72604-B0

### Parts List

- Raspberry Pi 4 Model B (High End Device)
- Raspberry Pi 3 Model B (Low End Device)
- Accessories:

  - 2 SD Cards for OS
  - 2 Micro HDMI Cables
  - 2 AC Power adapters
  - 2 Ventilators
  - 2 Ethernet cables
  - Heat dissipators
  - Protective case for RPI4B
  - Protective case for RPI3B

- [Raspberry Pi 3 Model B+](https://www.amazon.es/-/pt/dp/B07BDR5PDW/ref=sr_1_8?crid=1W2UC5CZ9GWE0&keywords=raspberry+pi+3b&qid=1706030100&sprefix=raspberry+pi+3b%2Caps%2C114&sr=8-8) - Low-end device - 1GB RAM - 62,27€
- [Raspberry Pi 3 Model B Accessories](https://www.amazon.es/dp/B01M3QWZE7/ref=sspa_dk_detail_1?pd_rd_i=B01M3QWZE7&pd_rd_w=sbMla&content-id=amzn1.sym.9c67f205-18e7-4d34-beb2-37ec708092ed&pf_rd_p=9c67f205-18e7-4d34-beb2-37ec708092ed&pf_rd_r=E9TP9Q0VT2W7K651HSW5&pd_rd_wg=t5rpw&pd_rd_r=309a4a43-00b0-43db-85f1-824cfc51f204&s=computers&sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWw&th=1) - AC adapter, protective case, heat dissipator, ventilator. - 14.99€

- [Raspberry Pi 4 Model B](https://www.amazon.es/dp/B0C7KXMP7W/ref=sspa_dk_detail_0?pd_rd_i=B0C7KXMP7W&pd_rd_w=WWjm5&content-id=amzn1.sym.9c67f205-18e7-4d34-beb2-37ec708092ed&pf_rd_p=9c67f205-18e7-4d34-beb2-37ec708092ed&pf_rd_r=53C7JP1KND6P291YSYKP&pd_rd_wg=rWrRd&pd_rd_r=52f4dda8-d577-4351-a1de-888a66ab927e&s=computers&sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWw&th=1) - High-end device - 4GB RAM with 4K, H.265 support - 84,99€

- [Raspberry Pi 4 Model B Accessories](https://www.amazon.es/dp/B07W4T5CCD/ref=sspa_dk_detail_4?psc=1&pd_rd_i=B07W4T5CCD&pd_rd_w=BYGPZ&content-id=amzn1.sym.9c67f205-18e7-4d34-beb2-37ec708092ed&pf_rd_p=9c67f205-18e7-4d34-beb2-37ec708092ed&pf_rd_r=3EYH2DFG9PS49XKC83G7&pd_rd_wg=2qxq6&pd_rd_r=f16713c5-2006-4c69-a678-2bcadd4819dd&s=computers&sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWw) - Protective case, heat dissipator, ventilator, AC Power adapter, 1 Micro HDMI (Nicer transparent design) - 17,99€
- [SD Card](https://www.amazon.es/-/pt/dp/B08TJTB8XS/ref=twister_B08TJXX3MD?_encoding=UTF8&psc=1) - 2 x 64GB - 17,88€

### Software Configuration: Custom Linux Image with WPE/RDK

To create a generic device for testing, we will develop a custom Linux OS image, including key components like the [WPE browser](https://github.com/WebPlatformForEmbedded/WPEWebKit) with MSE/EME support, [Gstreamer](https://github.com/GStreamer/gstreamer) for media playback, PlayReady DRM, and the Thunder Metrological UI from [Comcast's WPEFramework](https://github.com/rdkcentral/Thunder).

![Alt text](./mvpd-integration-testing-proposal/metrological-ui.png)

- **Cross-compiling Linux OS**: We'll explore two main methods for cross-compilation: using [Buildroot](https://buildroot.org/) and using [Yocto Project](https://www.yoctoproject.org/). Each method will be evaluated to ensure compatibility and performance.

- **Using RDK Images**: Since RDK provides Raspberry Pi images [online](https://rdkcentral.com/rdk-profiles/), we will download and flash these images onto the SD card, streamlining the setup process. Choosing this path would require closer collaboration with Comcast RDK team.

- **Device Validation**: After setting up the device, we will perform a series of tests to validate that it closely resembles the MVPD device in functionality and performance.

#### Using RDK Image

By closely collaborating with RDK team, we obtained the RDK image for Raspberry pi 4B shared in this Jira ticket - https://jira.rdkcentral.com/jira/browse/RDKVSUP-43.

#### Running app

On Metrologic UI:

- Open HtmlApp
- Insert Html App link, e.g., https://ytlr-cert.appspot.com/2021/main.html?test_type=conformance-test#1705332489185

##### Accessing Metrological UI

- Navigate to `<IP>:9998/Service/Controller/UI`.
- Inspector Button doesn't work.
- The Metrological inspector is available at `<IP>:10000`

#### Opening Reference App

- Need to figure out the certificates

### Device Lab Integration

Once the device is operational, it will be installed in our device lab. This setup will allow remote control and management of the device, essential for our testing framework.

- **Lab Setup and Device Registration**: The device will be installed in the lab and registered with essential details like network configuration and IP address. The location of a device lab will be in Portuguese Sky Office, which aligns with the location of MVPD devices Core Video SDK JS team. Furthermore, the portuguese client team International Workstream manifested their interest in adding the such a device into their lab as well, thus using portuguese device lab is a strategic win-win for both our teams.

- **Remote Access and Management**: Procedures will be documented for remote access via SSH, enabling tasks like rebooting, log inspection, and path configuration for [Selenium](https://www.selenium.dev) automation. Using Selenium is a natural choice since it aligns with our CVSDK JS team tools for automation on other devices.

### Automation Setup: Integration with Cross Driver Server

![Alt text](./mvpd-integration-testing-proposal/automation-services.png)

Our goal is to ensure the new device can be seamlessly incorporated into our automation workflow.

- **Remote Device Management**: We'll use the [Cross Driver](https://github.com/sky-uk/client-tool-crossdriver) server which is an implementation of [WebDriver](https://www.w3.org/TR/webdriver2/) protocol for the remote control of our new RDK/WPE devices. This setup will also allow us to manage concurrent access and maintain the state of the device.

- **Automation Workflow**: Detailed steps will be outlined for integrating the device with the Cross Driver Server, ensuring efficient management of automation sessions.

- **Contacts**: We can discuss with CrossDriver team how is it best to integrate new device intor the Cross Driver. [@Diego Di Mauro](https://sky.slack.com/team/U04FP50T8) (Senior Dev) and [@satya.peddireddi](https://sky.slack.com/team/U0ARU94JG) (EM) said that we can schedule a call once we get into the integration phase.

### Jenkins Integration: CI/CD Pipeline Enhancement

The final step is to integrate this new device into our Jenkins device tests step.

- **Device List Update**: We will update the list of devices in Jenkins to include the new RDK device.

- **Test Suite Configuration**: Specific feature tests will be tagged with a new identifier representing the RDK device. This will allow the CI to execute the Jenkins script and run the test suite against the new device on each pull request.

## Conclusion

This proposal for a RDK/WPE based testing framework aims to address our MVPD scalability challenges efficiently. It's a step towards enhancing our testing processes and maintaining quality as we grow.

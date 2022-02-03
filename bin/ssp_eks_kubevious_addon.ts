import { App } from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';
import { SspKubeviousAddOn } from '../lib/ssp_eks_kubevious_addon-stack'
import { sspIngressClassAddOn } from '../lib/ssp_eks_ingressClass_addon-stack'

const app = new App();

ssp.EksBlueprint.builder()
    .addOns(new SspKubeviousAddOn({
        kubeviousServiceType: 'NodePort',
    }))
    .addOns(new sspIngressClassAddOn({annotations: { "test": "test"}, labels: { "test2": "test2"}}))
    .build(app, 'my-kubevious-addon');

import React, { Component } from 'react';
import {
    View, Image, Text, Button, TextInput, AsyncStorage,
    ScrollView, FlatList, ActivityIndicator,
    KeyboardAvoidingView
} from 'react-native';
import { Header, SearchBar } from 'react-native-elements';
import { LinearGradient } from 'expo';
import { NavigationEvents } from 'react-navigation';

import SearchResultTicketButton from 'library/components/SearchResultTicketButton';
import GradientBackground from 'library/components/GradientBackground';
import Loader from 'library/components/Loader';
import styles from './styles';
import constants from 'utils/constants';
import colors from 'res/colors';
import strings from 'res/strings';

export default class HomeScreen extends Component {
    static navigationOptions = {
        headerBackground: (
            <LinearGradient
              colors={[colors.black, colors.navyblue]}
              style={{ flex: 1, opacity: 0.85 }}
              start={[1, 0]}
              end={[0, 1]}
            />
        ),
        headerTitle: 'Home',
        headerTitleStyle: { flex: 1, color: 'white', textAlign: 'center' }
      };

    constructor(props) {
        super(props);

        this.state = {isLoading: true, pastPlaylists: [], search: ''};

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);

        // this will refresh the page when user navigates to it
        // otherwise it will load data once
        const didBlurSubscription = this.props.navigation.addListener(
            'willFocus',
            payload => {
                this.getPastPlaylists();
            }
        );

        this._isMounted = false;
    }

    componentWillMount() {
        this._isMounted = true;
    }

    componentDidMount() {
        this.getPastPlaylists();
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    // Gets all playlists a user has made from local storage
    getPastPlaylists = async () => {
        // await AsyncStorage.setItem(constants.pastPlaylists, "");
        let p = await AsyncStorage.getItem(constants.pastPlaylists);
        // console.log(JSON.parse(p));
        if(p != null) {
            if(this._isMounted)
                this.setState({isLoading: false, pastPlaylists: JSON.parse(p)});
        } else {
            if(this._isMounted)
                this.setState({isLoading: false});
        }
    }

    handleChange(text) {
        this.setState({search: text});
    }

    handleSubmit(event) {
        if(this.state.search.trim() === '') {
            // alert
        } else {
            this.props.navigation.navigate('Results', {
                searchValue: this.state.search,
            });
        }
    }

    render() {
        if(this.state.isLoading) {
            return (
                <GradientBackground colors={[colors.pink, colors.navyblue]}>
                    <Loader />
                </GradientBackground>
            )
        }
        if(this.state.pastPlaylists.length == 0) {
            return (
                <KeyboardAvoidingView style={styles.rootContainer} behavior='padding' enabled>
                <View style={styles.rootContainer}>
                    <NavigationEvents
                        onWillFocus={payload => this.getPastPlaylists()} />
                    <GradientBackground colors={[colors.pink, colors.navyblue]}>
                        <SearchBar
                            containerStyle={styles.searchContainer}
                            placeholder={strings.searchPlaceholder}
                            onChangeText={this.handleChange}
                            value={this.state.search}
                            onSubmitEditing={this.handleSubmit}
                            inputStyle={styles.input} />
                        <View style={styles.noPlaylistsContainer}>
                            <Text style={styles.noPlaylistsText}>You have not made any playlists yet!
                                Search for an artist to begin making playlists.</Text>
                        </View>
                    </GradientBackground>
                </View>
                </KeyboardAvoidingView>
            )
        }
        return (
            <KeyboardAvoidingView style={styles.rootContainer} behavior='padding' enabled>
            <View style={styles.rootContainer}>
                <NavigationEvents
                    onWillFocus={payload => this.getPastPlaylists()} />
                <GradientBackground colors={[colors.pink, colors.navyblue]}>
                    <ScrollView style={styles.scrollContainer}>
                        <SearchBar
                            containerStyle={styles.searchContainer}
                            placeholder={strings.searchPlaceholder}
                            onChangeText={this.handleChange}
                            value={this.state.search}
                            onSubmitEditing={this.handleSubmit}
                            inputStyle={styles.input}
                        />
                        <Text style={styles.centeredText}>Playlists you've made</Text>
                        <FlatList
                            style={styles.flatlist}
                            data={this.state.pastPlaylists}
                            onEndReachedThreshold={0.5}
                            onEndReached={() => {
                                this.loadMore()
                            }}
                            renderItem={({item}) =>
                                <SearchResultTicketButton data={item} />
                            }
                        />
                    </ScrollView>
                </GradientBackground>
            </View>
            </KeyboardAvoidingView>
        )
    }

    loadMore = async () => {
        return null;
    }
}
